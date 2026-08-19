/**
 * Notificaciones por correo del ciclo de un territorio:
 *   - al asignarlo    → se avisa al publicador asignado
 *   - al completarlo o devolverlo → se avisa al admin que lo asignó
 *
 * Corre en Cloud Functions, no en el cliente: la app publicada en GitHub Pages
 * nunca ve las direcciones de correo ni las credenciales de SES. Los disparadores
 * son escrituras en Firestore, así que no hay endpoint que un usuario pueda
 * llamar para mandar correos.
 */
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineInt, defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const AWS_REGION = defineString('AWS_SES_REGION', { default: 'us-east-1' });
const MAIL_FROM = defineString('MAIL_FROM', { default: 'territorios@delonix.io' });
const APP_URL = defineString('APP_URL');
const DAILY_LIMIT = defineInt('MAIL_DAILY_LIMIT', { default: 100 });

const AWS_KEY = defineSecret('AWS_SES_ACCESS_KEY_ID');
const AWS_SECRET = defineSecret('AWS_SES_SECRET_ACCESS_KEY');

const TRIGGER = {
  document: 'congregations/{congId}/history/{histId}',
  region: 'us-east1',
  secrets: [AWS_KEY, AWS_SECRET],
  retry: false
};

initializeApp();
const db = getFirestore();

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Decide si corresponde enviar. Corta si ya se notificó este evento (los
 * triggers de Firestore son at-least-once) o si se agotó el cupo del día.
 * Pura a propósito: es la que protege la factura de AWS, y así se puede probar.
 */
export function decideSend({ historyExists, notifiedAt, sent, limit }) {
  if (!historyExists) return { ok: false, reason: 'history-deleted' };
  if (notifiedAt) return { ok: false, reason: 'already-notified' };
  if (sent >= limit) return { ok: false, reason: 'daily-limit-reached', sent };
  return { ok: true, sent: sent + 1 };
}

/**
 * Aplica la decisión en una transacción, para que dos ejecuciones simultáneas
 * no se pasen del cupo. `marker` es el campo que sella este evento concreto:
 * asignar y completar se notifican por separado sobre el mismo documento.
 *
 * ponytail: la reserva se consume aunque SES falle después, así que un envío
 * fallido no se reintenta. Es deliberado — un correo perdido cuesta menos que
 * un bucle de reintentos contra una cuenta de AWS. Si hace falta reintentar,
 * marcar el campo sólo tras el envío y aceptar el riesgo de duplicados.
 */
async function reserveSend(historyRef, limit, marker) {
  const quotaRef = db.collection('mailQuota').doc(today());

  return db.runTransaction(async (tx) => {
    const [history, quota] = await Promise.all([tx.get(historyRef), tx.get(quotaRef)]);

    const decision = decideSend({
      historyExists: history.exists,
      notifiedAt: history.exists ? history.get(marker) : null,
      sent: quota.exists ? quota.get('sent') || 0 : 0,
      limit
    });
    if (!decision.ok) return decision;

    tx.set(quotaRef, { sent: decision.sent, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.update(historyRef, { [marker]: FieldValue.serverTimestamp() });
    return decision;
  });
}

function territoryLabel(territory) {
  return [territory.number, territory.name].filter(Boolean).join(' — ');
}

function compose(lines, link) {
  const body = link ? lines.concat(['', `Verlo en la app: ${link}`]) : lines;
  const text = body.concat(['', 'Tarjetas de Territorio']).join('\n');
  const html = `<p>${lines.join('<br>')}</p>` +
    (link ? `<p><a href="${link}">Ver el territorio</a></p>` : '');
  return { text, html };
}

export function buildEmail(person, territory, entry, appUrl) {
  const label = territoryLabel(territory);
  const link = appUrl ? `${appUrl}#/territories/${territory.id}` : '';

  const lines = [
    `Hola ${person},`,
    '',
    `Se te asignó el territorio ${label}.`,
    `Fecha de asignación: ${entry.startDate || 'hoy'}.`
  ];
  if (entry.notes) lines.push(`Nota: ${entry.notes}`);

  return { subject: `Territorio asignado: ${label}`, ...compose(lines, link) };
}

export function buildCompletionEmail(recipient, territory, entry, appUrl) {
  const label = territoryLabel(territory);
  const link = appUrl ? `${appUrl}#/territories/${territory.id}` : '';
  const returned = entry.status === 'returned';
  const verb = returned ? 'devolvió' : 'completó';

  const lines = [
    `Hola ${recipient},`,
    '',
    `${entry.person || 'El publicador'} ${verb} el territorio ${label}.`,
    `Fecha de asignación: ${entry.startDate || '—'}.`,
    `Fecha en que se ${verb}: ${entry.endDate || 'sin registrar'}.`
  ];
  if (entry.notes) lines.push(`Nota: ${entry.notes}`);

  return {
    subject: `Territorio ${returned ? 'devuelto' : 'completado'}: ${label}`,
    ...compose(lines, link)
  };
}

async function loadTerritory(congId, territoryId) {
  const snap = await db.doc(`congregations/${congId}/territories/${territoryId}`).get();
  return {
    id: territoryId,
    number: snap.exists ? snap.get('number') : territoryId,
    name: snap.exists ? snap.get('name') : ''
  };
}

async function sendMail(to, mail) {
  const ses = new SESv2Client({
    region: AWS_REGION.value(),
    credentials: { accessKeyId: AWS_KEY.value(), secretAccessKey: AWS_SECRET.value() }
  });

  await ses.send(new SendEmailCommand({
    FromEmailAddress: MAIL_FROM.value(),
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: mail.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: mail.text, Charset: 'UTF-8' },
          Html: { Data: mail.html, Charset: 'UTF-8' }
        }
      }
    }
  }));
}

/**
 * Tronco común: valida config, resuelve destinatario, reserva cupo y envía.
 * `plan` trae { uid, ref, marker, build } — a quién, sobre qué documento, con
 * qué sello, y qué texto.
 */
async function notify(event, entry, plan) {
  const { histId, congId } = event.params;

  if (!MAIL_FROM.value()) {
    logger.error('MAIL_FROM sin configurar; no se envía nada');
    return;
  }
  if (!plan.uid) {
    logger.info('Sin usuario a quien notificar', { histId, marker: plan.marker });
    return;
  }

  const user = await db.collection('users').doc(plan.uid).get();
  const email = user.exists ? user.get('email') : null;
  if (!email) {
    logger.info('Usuario sin correo, no se notifica', { uid: plan.uid });
    return;
  }

  const territory = await loadTerritory(congId, entry.territoryId);

  const reservation = await reserveSend(plan.ref, DAILY_LIMIT.value(), plan.marker);
  if (!reservation.ok) {
    logger.warn('Envío omitido', { reason: reservation.reason, histId, marker: plan.marker });
    return;
  }

  const mail = plan.build(user.get('displayName'), territory);

  try {
    await sendMail(email, mail);
    logger.info('Notificación enviada', { histId, marker: plan.marker, sentToday: reservation.sent });
  } catch (err) {
    logger.error('SES rechazó el envío', { histId, marker: plan.marker, error: err.message });
  }
}

export const notifyOnAssignment = onDocumentCreated(TRIGGER, async (event) => {
  if (!event.data) return;
  const entry = event.data.data();

  // Sólo asignaciones activas a un usuario con cuenta.
  if ((entry.type || 'assignment') !== 'assignment') return;
  if ((entry.status || 'active') !== 'active') return;

  await notify(event, entry, {
    uid: entry.assignedToUid,
    ref: event.data.ref,
    marker: 'notifiedAt',
    build: (name, territory) =>
      buildEmail(name || entry.person || 'hermano', territory, entry, APP_URL.value())
  });
});

/**
 * Al completar o devolver se avisa al admin que asignó el territorio
 * (`createdBy`), que es quien lleva el registro. Si el admin se completó su
 * propia asignación no se manda nada: ya lo sabe.
 */
export const notifyOnCompletion = onDocumentUpdated(TRIGGER, async (event) => {
  if (!event.data) return;

  const before = event.data.before.data();
  const entry = event.data.after.data();

  if ((entry.type || 'assignment') !== 'assignment') return;

  const wasActive = (before.status || 'active') === 'active';
  const isClosed = entry.status === 'completed' || entry.status === 'returned';
  if (!wasActive || !isClosed) return;

  if (entry.createdBy && entry.createdBy === entry.assignedToUid) {
    logger.info('Quien asignó es quien completó; no se notifica', { histId: event.params.histId });
    return;
  }

  await notify(event, entry, {
    uid: entry.createdBy,
    ref: event.data.after.ref,
    marker: 'completionNotifiedAt',
    build: (name, territory) =>
      buildCompletionEmail(name || 'hermano', territory, entry, APP_URL.value())
  });
});
