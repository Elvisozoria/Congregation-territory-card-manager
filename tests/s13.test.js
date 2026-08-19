import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  serviceYear,
  serviceYearOf,
  buildS13Row,
  availableServiceYears,
  serviceYearLabel
} from '../src/views/s13.js';

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

test('service year of an ISO date: September flips to the next year', () => {
  assert.equal(serviceYearOf('2025-08-31'), 2025);
  assert.equal(serviceYearOf('2025-09-01'), 2026);
  assert.equal(serviceYearOf('2026-08-31'), 2026);
  assert.equal(serviceYearOf(''), null);
  assert.equal(serviceYearOf(null), null);
});

test('filtering by service year keeps only that year\'s assignments', () => {
  const history = [
    { person: 'Nueva', startDate: '2025-10-01', endDate: '2025-10-20' }, // año 2026
    { person: 'Vieja', startDate: '2025-03-01', endDate: '2025-03-15' }  // año 2025
  ];

  const y2026 = buildS13Row(history, 4, 2026);
  assert.deepEqual(y2026.cells.map((c) => c.person), ['Nueva', '', '', '']);

  const y2025 = buildS13Row(history, 4, 2025);
  assert.deepEqual(y2025.cells.map((c) => c.person), ['Vieja', '', '', '']);
});

test('with a year selected, last-completed is the carry-over from before it', () => {
  const history = [
    { person: 'Nueva', startDate: '2025-10-01', endDate: '2025-10-20' },
    { person: 'Vieja', startDate: '2025-03-01', endDate: '2025-03-15' }
  ];
  // El año 2026 empieza el 2025-09-01, así que acarrea la última de antes.
  assert.equal(buildS13Row(history, 4, 2026).lastCompleted, '2025-03-15');
  // Sin nada anterior, la columna queda vacía.
  assert.equal(buildS13Row(history, 4, 2025).lastCompleted, '');
  // Sin filtro, es la última de todas.
  assert.equal(buildS13Row(history, 4, null).lastCompleted, '2025-10-20');
});

test('available service years come back newest first, no duplicates', () => {
  assert.deepEqual(availableServiceYears([
    { startDate: '2025-10-01' },
    { startDate: '2025-11-05' },
    { startDate: '2025-03-01' },
    { startDate: '' }
  ]), [2026, 2025]);
});

test('service years are labelled by the range they span, not the ending year', () => {
  // El que arranca en septiembre de 2026 se llama 2026-2027.
  assert.equal(serviceYearLabel(2027), '2026-2027');
  assert.equal(serviceYearLabel(serviceYearOf('2026-09-01')), '2026-2027');
  // El que corre ahora (agosto de 2026) es el 2025-2026.
  assert.equal(serviceYearLabel(serviceYear(new Date('2026-08-19T12:00:00'))), '2025-2026');
});
