import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, todayISO } from '../src/utils/helpers.js';
import { setLang } from '../src/i18n/i18n.js';

test('las fechas se muestran como las escribe la gente', () => {
  setLang('es');
  assert.equal(formatDate('2026-08-23'), '23/08/2026');
  assert.equal(formatDate('2026-08-23', { short: true }), '23/08/26');
});

test('en inglés va el mes primero', () => {
  setLang('en');
  assert.equal(formatDate('2026-08-23'), '08/23/2026');
  setLang('es');
});

test('no hay corrimiento de día por zona horaria', () => {
  setLang('es');
  // `new Date('2026-01-01')` es medianoche UTC y en RD (UTC-4) caería el 31/12.
  // Se parte el string, así que el día no se mueve.
  assert.equal(formatDate('2026-01-01'), '01/01/2026');
  assert.equal(formatDate('2026-12-31'), '31/12/2026');
});

test('lo vacío queda vacío y lo raro pasa tal cual', () => {
  assert.equal(formatDate(''), '');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate(undefined), '');
  assert.equal(formatDate('ayer'), 'ayer');
});

test('todayISO usa el calendario local, no UTC', () => {
  const iso = todayISO();
  assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);

  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  assert.equal(iso, `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
});
