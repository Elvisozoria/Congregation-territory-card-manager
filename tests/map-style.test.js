import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStyle, DEFAULT_STYLE, startPoint, googleMapsDirections, wazeDirections } from '../src/utils/map-style.js';

test('nothing saved means the look the app always had', () => {
  assert.deepEqual(normalizeStyle(null), DEFAULT_STYLE);
  assert.deepEqual(normalizeStyle({}), DEFAULT_STYLE);
});

test('keeps valid choices and clamps the percentages', () => {
  const s = normalizeStyle({ base: 'hybrid', veil: 140, outlineColor: '#F59E0B', outlineWeight: '5', fill: 80, labelSize: 13 });
  assert.equal(s.base, 'hybrid');
  assert.equal(s.veil, 100);
  assert.equal(s.outlineColor, '#F59E0B');
  assert.equal(s.outlineWeight, 5);
  assert.equal(s.fill, 30);
  assert.equal(s.labelSize, 13);
});

// Un valor a mano en Firestore no debe romper todas las tarjetas.
test('junk falls back field by field', () => {
  const s = normalizeStyle({ base: 'google', veil: 'mucho', outlineColor: 'red', outlineWeight: 9, labelSize: 40 });
  assert.deepEqual(s, DEFAULT_STYLE);
});

test('the start point is the entrance if marked, else the centre', () => {
  const centre = { lat: 1, lng: 2 };
  const plain = { landmarks: [{ name: 'Colmado', lat: 5, lng: 6 }] };
  assert.deepEqual(startPoint(plain, centre), { lat: 1, lng: 2, isStart: false });
  const withEntry = { landmarks: [{ name: 'Colmado', lat: 5, lng: 6 }, { name: 'Entrada', lat: 7, lng: 8, isStart: true }] };
  assert.deepEqual(startPoint(withEntry, centre), { lat: 7, lng: 8, isStart: true });
  assert.equal(startPoint({}, null), null);
});

test('navigation links carry the exact point', () => {
  assert.equal(googleMapsDirections(19.5885, -70.6454), 'https://www.google.com/maps/dir/?api=1&destination=19.5885,-70.6454');
  assert.equal(wazeDirections(19.5885, -70.6454), 'https://waze.com/ul?ll=19.5885,-70.6454&navigate=yes');
});
