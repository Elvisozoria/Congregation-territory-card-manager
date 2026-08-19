import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideSend, buildEmail, buildCompletionEmail } from '../index.js';

const base = { historyExists: true, notifiedAt: null, sent: 0, limit: 100 };

test('envía cuando hay cupo y no se ha notificado', () => {
  assert.deepEqual(decideSend(base), { ok: true, sent: 1 });
});

test('corta al llegar al tope diario', () => {
  assert.equal(decideSend({ ...base, sent: 100 }).ok, false);
  assert.equal(decideSend({ ...base, sent: 100 }).reason, 'daily-limit-reached');
  // El último cupo sí se usa.
  assert.equal(decideSend({ ...base, sent: 99 }).ok, true);
});

test('no notifica dos veces la misma asignación', () => {
  const d = decideSend({ ...base, notifiedAt: new Date() });
  assert.equal(d.ok, false);
  assert.equal(d.reason, 'already-notified');
});

test('un tope de 0 no deja pasar nada', () => {
  assert.equal(decideSend({ ...base, limit: 0 }).ok, false);
});

test('el correo lleva territorio, fecha y enlace', () => {
  const mail = buildEmail(
    'Juan',
    { id: 'abc', number: 3, name: 'Jardines del Rey - C' },
    { startDate: '2026-08-19', notes: 'Empezar por la calle 5' },
    'https://ejemplo.com/'
  );
  assert.match(mail.subject, /3 — Jardines del Rey - C/);
  assert.match(mail.text, /Hola Juan/);
  assert.match(mail.text, /2026-08-19/);
  assert.match(mail.text, /Empezar por la calle 5/);
  assert.match(mail.html, /https:\/\/ejemplo\.com\/#\/territories\/abc/);
});

test('sin APP_URL el correo sale sin enlace, no roto', () => {
  const mail = buildEmail('Ana', { id: 'x', number: 1, name: 'A' }, { startDate: '2026-01-01' }, '');
  assert.doesNotMatch(mail.text, /undefined/);
  assert.doesNotMatch(mail.html, /href/);
});

test('el aviso de completado dice quién, cuándo y sobre qué territorio', () => {
  const mail = buildCompletionEmail(
    'Elvis',
    { id: 'abc', number: 3, name: 'Jardines del Rey - C' },
    { person: 'Juan', status: 'completed', startDate: '2026-07-01', endDate: '2026-08-15' },
    'https://ejemplo.com/'
  );
  assert.match(mail.subject, /^Territorio completado: 3 — Jardines del Rey - C$/);
  assert.match(mail.text, /Hola Elvis/);
  assert.match(mail.text, /Juan completó el territorio/);
  assert.match(mail.text, /2026-07-01/);
  assert.match(mail.text, /2026-08-15/);
});

test('devolver y completar se redactan distinto', () => {
  const entry = { person: 'Ana', status: 'returned', startDate: '2026-07-01', endDate: '2026-07-20' };
  const mail = buildCompletionEmail('Elvis', { id: 'x', number: 1, name: 'A' }, entry, '');
  assert.match(mail.subject, /Territorio devuelto/);
  assert.match(mail.text, /Ana devolvió el territorio/);
  assert.doesNotMatch(mail.text, /completó/);
});

test('sin fecha de cierre el aviso no dice undefined', () => {
  const mail = buildCompletionEmail('Elvis', { id: 'x', number: 1, name: 'A' },
    { person: 'Ana', status: 'completed', startDate: '2026-07-01' }, '');
  assert.match(mail.text, /sin registrar/);
  assert.doesNotMatch(mail.text, /undefined/);
});

test('asignar y completar usan sellos distintos, así que no se pisan', () => {
  // Un doc ya notificado al asignar sigue pudiendo notificar al completar.
  const yaAsignado = { historyExists: true, sent: 0, limit: 100 };
  assert.equal(decideSend({ ...yaAsignado, notifiedAt: new Date() }).ok, false);
  assert.equal(decideSend({ ...yaAsignado, notifiedAt: null }).ok, true);
});
