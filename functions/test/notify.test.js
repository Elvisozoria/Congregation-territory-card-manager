import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideSend, buildEmail } from '../index.js';

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
