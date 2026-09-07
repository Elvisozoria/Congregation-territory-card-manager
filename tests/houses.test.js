import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHouses } from '../src/utils/helpers.js';

test('reads a plain count', () => {
  assert.equal(parseHouses('25'), 25);
  assert.equal(parseHouses(25), 25);
  assert.equal(parseHouses('0'), 0);
});

// No saber cuántas casas hay es lo normal en el campo, y es distinto de cero.
test('an unknown count is null, not zero', () => {
  assert.equal(parseHouses(''), null);
  assert.equal(parseHouses('   '), null);
  assert.equal(parseHouses(null), null);
  assert.equal(parseHouses(undefined), null);
});

test('rejects junk and negatives', () => {
  assert.equal(parseHouses('muchas'), null);
  assert.equal(parseHouses('-5'), null);
  assert.equal(parseHouses(Infinity), null);
});

test('rounds a decimal to whole houses', () => {
  assert.equal(parseHouses('12.4'), 12);
  assert.equal(parseHouses('12.6'), 13);
});
