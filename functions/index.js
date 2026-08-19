/**
 * Notificación por correo al asignar un territorio.
 *
 * Corre en Cloud Functions, no en el cliente: la app publicada en GitHub Pages
 * nunca ve las direcciones de correo ni las credenciales de SES. El disparador
 * es la creación del documento de historial, así que no hay endpoint que un
 * usuario pueda llamar para mandar correos.
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineInt, defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const AWS_REGION = defineString('AWS_SES_REGION', { default: 'us-east-1' });
const MAIL_FROM = defineString('MAIL_FROM');
const APP_URL = defineString('APP_URL');
const DAILY_LIMIT = defineInt('MAIL_DAILY_LIMIT', { default: 100 });

const AWS_KEY = defineSecret('AWS_SES_ACCESS_KEY_ID');
const AWS_SECRET = defineSecret('AWS_SES_SECRET_ACCESS_KEY');

initializeApp();
const db = getFirestore();

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Decide si corresponde enviar. Corta si ya se notificó esta asignación (los
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
 * no se pasen del cupo.
 *
 * ponytail: la reserva se consume aunque SES falle después, así que un envío
 * fallido no se reintenta. Es deliberado — un correo perdido cuesta menos que
 * un bucle de reintentos contra una cuenta de AWS. Si hace falta reintentar,
 * marcar notifiedAt sólo tras el envío y aceptar el riesgo de duplicados.
 */
async function reserveSend(historyRef, limit) {
  const quotaRef = db.collection('mailQuota').doc(today());

  return db.runTransaction(async (tx) => {
    const [history, quota] = await Promise.all([tx.get(historyRef), tx.get(quotaRef)]);

    const decision = decideSend({
      historyExists: history.exists,
      notifiedAt: history.exists ? history.get('notifiedAt') : null,
      sent: quota.exists ? quota.get('sent') || 0 : 0,
      limit
    });
    if (!decision.ok) return decision;

    tx.set(quotaRef, { sent: decision.sent, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.update(historyRef, { notifiedAt: FieldValue.serverTimestamp() });
    return decision;
  });
}

export function buildEmail(person, territory, entry, appUrl) {
  const label = [territory.number, territory.name].filter(Boolean).join(' — ');
  const link = appUrl ? `${appUrl}#/territories/${territory.id}` : '';

  const lines = [
    `Hola ${person},`,
    '',
    `Se te asignó el territorio ${label}.`,
    `Fecha de asignación: ${entry.startDate || 'hoy'}.`
  ];
  if (entry.notes) lines.push(`Nota: ${entry.notes}`);
  if (link) lines.push('', `Verlo en la app: ${link}`);
  lines.push('', 'Tarjetas de Territorio');

  const text = lines.join('\n');
  const html = `<p>${lines.slice(0, -2).join('<br>')}</p>` +
    (link ? `<p><a href="${link}">Ver el territorio</a></p>` : '');

  return { subject: `Territorio asignado: ${label}`, text, html };
}

export const notifyOnAssignment = onDocumentCreated(
  {
    document: 'congregations/{congId}/history/{histId}',
    region: 'us-east1',
    secrets: [AWS_KEY, AWS_SECRET],
    retry: false
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const entry = snap.data();

    // Sólo asignaciones activas a un usuario con cuenta.
    if ((entry.type || 'assignment') !== 'assignment') return;
    if ((entry.status || 'active') !== 'active') return;
    if (!entry.assignedToUid) {
      logger.info('Asignación sin usuario vinculado, no se notifica', { histId: event.params.histId });
      return;
    }

    const from = MAIL_FROM.value();
    if (!from) {
      logger.error('MAIL_FROM sin configurar; no se envía nada');
      return;
    }

    const user = await db.collection('users').doc(entry.assignedToUid).get();
    const email = user.exists ? user.get('email') : null;
    if (!email) {
      logger.info('Usuario sin correo, no se notifica', { uid: entry.assignedToUid });
      return;
    }

    const territorySnap = await db
      .doc(`congregations/${event.params.congId}/territories/${entry.territoryId}`)
      .get();
    const territory = {
      id: entry.territoryId,
      number: territorySnap.exists ? territorySnap.get('number') : entry.territoryId,
      name: territorySnap.exists ? territorySnap.get('name') : ''
    };

    const reservation = await reserveSend(snap.ref, DAILY_LIMIT.value());
    if (!reservation.ok) {
      logger.warn('Envío omitido', { reason: reservation.reason, histId: event.params.histId });
      return;
    }

    const { subject, text, html } = buildEmail(
      user.get('displayName') || entry.person || 'hermano',
      territory,
      entry,
      APP_URL.value()
    );

    const ses = new SESv2Client({
      region: AWS_REGION.value(),
      credentials: { accessKeyId: AWS_KEY.value(), secretAccessKey: AWS_SECRET.value() }
    });

    try {
      await ses.send(new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [email] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: text, Charset: 'UTF-8' },
              Html: { Data: html, Charset: 'UTF-8' }
            }
          }
        }
      }));
      logger.info('Notificación enviada', { histId: event.params.histId, sentToday: reservation.sent });
    } catch (err) {
      logger.error('SES rechazó el envío', { histId: event.params.histId, error: err.message });
    }
  }
);
