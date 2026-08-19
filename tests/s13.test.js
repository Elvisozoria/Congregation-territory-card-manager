import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serviceYear, buildS13Row } from '../src/views/s13.js';

test('service year runs Sept 1 - Aug 31', () => {
  assert.equal(serviceYear(new Date('2026-08-31T12:00:00')), 2026);
  assert.equal(serviceYear(new Date('2026-09-01T12:00:00')), 2027);
});

test('row shows last N assignments oldest-first, like the paper form', () => {
  // El store devuelve el historial descendente por startDate.
  const history = [
    { person: 'E', startDate: '2026-05-01', endDate: '2026-05-20' },
    { person: 'D', startDate: '2026-04-01', endDate: '2026-04-15' },
    { person: 'C', startDate: '2026-03-01', endDate: '2026-03-10' },
    { person: 'B', startDate: '2026-02-01', endDate: '2026-02-10' },
    { person: 'A', startDate: '2026-01-01', endDate: '2026-01-10' }
  ];
  const row = buildS13Row(history, 4);

  assert.deepEqual(row.cells.map((c) => c.person), ['B', 'C', 'D', 'E']);
  assert.equal(row.lastCompleted, '2026-05-20');
});

test('open assignment leaves the completed date blank', () => {
  const row = buildS13Row([{ person: 'Juan', startDate: '2026-06-01', endDate: null }], 4);
  // Las asignaciones llenan de izquierda a derecha; los huecos quedan al final.
  assert.equal(row.cells[0].person, 'Juan');
  assert.equal(row.cells[0].endDate, '');
  assert.equal(row.cells[1].person, '');
  assert.equal(row.lastCompleted, '');
});

test('empty history yields blank cells, not undefined', () => {
  const row = buildS13Row([], 4);
  assert.equal(row.cells.length, 4);
  assert.deepEqual(row.cells[0], { person: '', startDate: '', endDate: '' });
  assert.equal(row.lastCompleted, '');
});

test('preaching entries are excluded from the assignment record', () => {
  const row = buildS13Row([
    { person: 'Salida de predicación', startDate: '2026-06-01', endDate: '2026-06-01', type: 'preaching' },
    { person: 'Ana', startDate: '2026-05-01', endDate: '2026-05-10', type: 'assignment' }
  ], 4);
  assert.deepEqual(row.cells.map((c) => c.person), ['Ana', '', '', '']);
  assert.equal(row.lastCompleted, '2026-05-10');
});
