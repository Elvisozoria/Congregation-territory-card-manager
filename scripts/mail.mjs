/**
 * Lógica pura del notificador: qué se envía, a quién y con qué texto.
 * Sin Firestore ni SES, para poder probarla sin credenciales ni red.
 */

/**
 * Decide si corresponde enviar. Corta si ya se notificó este evento (el cron
 * puede reprocesar la misma entrada) o si se agotó el cupo del día.
 * Es la que protege la factura de AWS, por eso vive aparte y con test.
 */
export function decideSend({ historyExists, notifiedAt, sent, limit }) {
  if (!historyExists) return { ok: false, reason: 'history-deleted' };
  if (notifiedAt) return { ok: false, reason: 'already-notified' };
  if (sent >= limit) return { ok: false, reason: 'daily-limit-reached', sent };
  return { ok: true, sent: sent + 1 };
}

/**
 * Qué aviso toca para una entrada de historial, si es que toca alguno.
 * Devuelve null cuando no hay nada que mandar — el cron entonces sólo
 * limpia la bandera.
 */
export function pendingNotification(entry) {
  if ((entry.type || 'assignment') !== 'assignment') return null;

  const status = entry.status || 'active';

  if (status === 'active') {
    if (entry.notifiedAt || !entry.assignedToUid) return null;
    return { kind: 'assignment', uid: entry.assignedToUid, marker: 'notifiedAt' };
  }

  if (status === 'completed' || status === 'returned') {
    if (entry.completionNotifiedAt || !entry.createdBy) return null;
    // Si quien asignó es quien cerró, ya lo sabe.
    if (entry.createdBy === entry.assignedToUid) return null;
    return { kind: 'completion', uid: entry.createdBy, marker: 'completionNotifiedAt' };
  }

  return null;
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
