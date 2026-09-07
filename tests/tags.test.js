import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTags,
  territoryTags,
  allTags,
  matchesTags,
  parseTagsInput,
  formatTagsInput
} from '../src/utils/tags.js';

test('trims, drops blanks and collapses duplicates', () => {
  assert.deepEqual(
    normalizeTags(['  Pedro García ', 'tardes', '', '   ', 'Pedro Garcia']),
    ['Pedro García', 'tardes', 'Pedro Garcia']
  );
  assert.deepEqual(normalizeTags(['Tardes', 'tardes', 'TARDES']), ['Tardes']);
  assert.deepEqual(normalizeTags(null), []);
  assert.deepEqual(normalizeTags('Yaroa'), ['Yaroa']);
});

// Migración: nada de lo guardado con el campo de grupo viejo puede perderse.
test('a legacy group_name becomes the first tag', () => {
  assert.deepEqual(territoryTags({ group_name: 'Centro' }), ['Centro']);
  assert.deepEqual(territoryTags({ group_name: 'Centro', tags: [] }), ['Centro']);
  assert.deepEqual(territoryTags({ group_name: '' }), []);
  assert.deepEqual(territoryTags(null), []);
});

test('real tags win over the legacy group', () => {
  assert.deepEqual(
    territoryTags({ group_name: 'Centro', tags: ['Yaroa', 'a pie'] }),
    ['Yaroa', 'a pie']
  );
});

test('the catalogue is derived from what is in use, sorted and deduped', () => {
  const territories = [
    { tags: ['Yaroa', 'a pie'] },
    { tags: ['yaroa'] },
    { group_name: 'Pedro García' },
    { tags: [] }
  ];
  assert.deepEqual(allTags(territories), ['a pie', 'Pedro García', 'Yaroa']);
  assert.deepEqual(allTags([]), []);
});

// Filtrar acumula condiciones: cruzar dimensiones es el motivo del filtro.
test('a territory must carry every selected tag', () => {
  const territory = { tags: ['Yaroa', 'a pie', 'tardes'] };
  assert.equal(matchesTags(territory, []), true);
  assert.equal(matchesTags(territory, ['Yaroa']), true);
  assert.equal(matchesTags(territory, ['Yaroa', 'a pie']), true);
  assert.equal(matchesTags(territory, ['Yaroa', 'negocios']), false);
  assert.equal(matchesTags({ tags: [] }, ['Yaroa']), false);
});

test('filtering ignores case', () => {
  assert.equal(matchesTags({ tags: ['Yaroa'] }, ['yaroa']), true);
  assert.equal(matchesTags({ group_name: 'Centro' }, ['centro']), true);
});

test('comma separated text round trips', () => {
  assert.deepEqual(parseTagsInput('Yaroa, a pie ,, tardes'), ['Yaroa', 'a pie', 'tardes']);
  assert.deepEqual(parseTagsInput(''), []);
  assert.equal(formatTagsInput(['Yaroa', 'a pie']), 'Yaroa, a pie');
  assert.deepEqual(parseTagsInput(formatTagsInput(['Yaroa', 'a pie'])), ['Yaroa', 'a pie']);
});
