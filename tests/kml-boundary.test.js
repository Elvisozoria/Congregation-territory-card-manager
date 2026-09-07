import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoordString } from '../src/utils/kml-import.js';

test('reads lng,lat pairs and drops altitude', () => {
  const coords = parseCoordString('-70.71,19.45,0 -70.72,19.46,0 -70.73,19.47,0');
  assert.deepEqual(coords, [[-70.71, 19.45], [-70.72, 19.46], [-70.73, 19.47]]);
});

test('drops the closing point that repeats the first', () => {
  const coords = parseCoordString('-70.71,19.45 -70.72,19.46 -70.73,19.47 -70.71,19.45');
  assert.equal(coords.length, 3);
  assert.deepEqual(coords[0], [-70.71, 19.45]);
});

test('keeps the last point when the ring is not closed', () => {
  const coords = parseCoordString('-70.71,19.45 -70.72,19.46 -70.73,19.47');
  assert.equal(coords.length, 3);
  assert.deepEqual(coords[2], [-70.73, 19.47]);
});

test('ignores junk and blank input', () => {
  assert.deepEqual(parseCoordString(''), []);
  assert.deepEqual(parseCoordString(null), []);
  assert.deepEqual(parseCoordString('nonsense -70.71,19.45 x,y 5'), [[-70.71, 19.45]]);
});

test('survives newlines and tabs between points', () => {
  const coords = parseCoordString('\n  -70.71,19.45\n\t-70.72,19.46\n  -70.73,19.47\n');
  assert.equal(coords.length, 3);
});

// Un límite de congregación real trae más de mil puntos; el parser no debe
// recortar ni reordenar nada.
test('handles a boundary-sized ring', () => {
  const points = [];
  for (let i = 0; i < 1083; i++) {
    points.push((-70.7 - i / 100000) + ',' + (19.4 + i / 100000));
  }
  points.push(points[0]);
  const coords = parseCoordString(points.join(' '));
  assert.equal(coords.length, 1083);
  assert.deepEqual(coords[0], [-70.7, 19.4]);
});
