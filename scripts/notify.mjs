/**
 * Notificador de territorios. Corre en GitHub Actions cada pocos minutos.
 *
 * Firebase se queda en plan Spark, que no permite Cloud Functions, así que el
 * disparador es un cron en vez de un trigger de Firestore. El cliente marca
 * `notifyPending: true` al asignar y al cerrar; este script recoge esas
 * entradas, manda el correo por SES y limpia la bandera.
 *
 * Nada de esto vive en el navegador: las direcciones de correo se leen aquí con
 * el service account, y las llaves de SES son secrets del repositorio.
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { decideSend, pendingNotification, buildEmail, buildCompletionEmail } from './mail.mjs';

const MAIL_FROM = process.env.MAIL_FROM || 'territorios@delonix.io';
const APP_URL = process.env.APP_URL || '';
const DAILY_LIMIT = parseInt(process.env.MAIL_DAILY_LIMIT || '100', 10);
const AWS_REGION = process.env.AWS_SES_REGION || 'us-east-1';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Tope duro por corrida, aparte del tope diario: si algo llenó la colección de
// banderas, una sola ejecución no puede vaciarla de golpe contra SES.
const MAX_PER_RUN = 25;

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  // Acepta el JSON directo o una ruta a archivo, para poder correrlo local.
  return JSON.parse(raw.trim().startsWith('{') ? raw : readFileSync(raw, 'utf8'));
}

initializeApp({ credential: cert(serviceAccount()) });
const db = getFirestore();

const ses = new SESv2Client({ region: AWS_REGION });

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Reserva un envío en una transacción, para que dos corridas solapadas no se
 * pasen del cupo ni manden el mismo correo dos veces.
 *
 * ponytail: la reserva se consume aunque SES falle después, así que un envío
 * fallido no se reintenta. Es deliberado — un correo perdido cuesta menos que
 * un bucle de reintentos contra una cuenta de AWS. El fallo queda en el log
 * del workflow.
 */
async function reserveSend(entryRef, marker) {
  const quotaRef = db.collection('mailQuota').doc(today());

  return db.runTransaction(async (tx) => {
    const [entry, quota] = await Promise.all([tx.get(entryRef), tx.get(quotaRef)]);

    const decision = decideSend({
      historyExists: entry.exists,
      notifiedAt: entry.exists ? entry.get(marker) : null,
      sent: quota.exists ? quota.get('sent') || 0 : 0,
      limit: DAILY_LIMIT
    });
    if (!decision.ok) return decision;

    tx.set(quotaRef, { sent: decision.sent, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.update(entryRef, { [marker]: FieldValue.serverTimestamp(), notifyPending: false });
    return decision;
  });
}

async function loadTerritory(congRef, territoryId) {
  const snap = await congRef.collection('territories').doc(String(territoryId)).get();
  return {
    id: territoryId,
    number: snap.exists ? snap.get('number') : territoryId,
    name: snap.exists ? snap.get('name') : ''
  };
}

async function send(to, mail) {
  if (DRY_RUN) {
    console.log(`[dry-run] Para: ${to}\nAsunto: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  await ses.send(new SendEmailCommand({
    FromEmailAddress: MAIL_FROM,
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

async function handle(congRef, doc) {
  const entry = doc.data();
  const plan = pendingNotification(entry);

  if (!plan) {
    // Nada que mandar (predicación, ya notificada, sin destinatario). Se limpia
    // la bandera para que el cron no la vuelva a mirar.
    await doc.ref.update({ notifyPending: false });
    return 'skipped';
  }

  const user = await db.collection('users').doc(plan.uid).get();
  const email = user.exists ? user.get('email') : null;
  if (!email) {
    console.log(`Usuario ${plan.uid} sin correo; no se notifica ${doc.id}`);
    await doc.ref.update({ notifyPending: false });
    return 'skipped';
  }

  const territory = await loadTerritory(congRef, entry.territoryId);

  const reservation = await reserveSend(doc.ref, plan.marker);
  if (!reservation.ok) {
    console.log(`Omitido ${doc.id}: ${reservation.reason}`);
    if (reservation.reason === 'daily-limit-reached') return 'limit';
    return 'skipped';
  }

  const name = user.get('displayName') || entry.person || 'hermano';
  const mail = plan.kind === 'assignment'
    ? buildEmail(name, territory, entry, APP_URL)
    : buildCompletionEmail(name, territory, entry, APP_URL);

  try {
    await send(email, mail);
    console.log(`Enviado (${plan.kind}) ${doc.id} → ${email}`);
    return 'sent';
  } catch (err) {
    console.error(`SES rechazó ${doc.id}: ${err.message}`);
    return 'failed';
  }
}

async function main() {
  const congregations = await db.collection('congregations').get();
  const tally = { sent: 0, skipped: 0, failed: 0 };

  for (const cong of congregations.docs) {
    const pending = await cong.ref
      .collection('history')
      .where('notifyPending', '==', true)
      .limit(MAX_PER_RUN)
      .get();

    for (const doc of pending.docs) {
      const result = await handle(cong.ref, doc);
      if (result === 'limit') {
        console.warn('Tope diario alcanzado; el resto espera a mañana.');
        console.log(JSON.stringify(tally));
        return;
      }
      if (result in tally) tally[result] += 1;
    }
  }

  console.log(JSON.stringify(tally));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
