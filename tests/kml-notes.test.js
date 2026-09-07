import { test } from 'node:test';
import assert from 'node:assert/strict';

// La regla de mezcla al reimportar un KML: el archivo rellena lo que falta,
// nunca pisa lo que alguien escribio a mano. Se prueba la regla sola porque el
// parseo necesita DOM y las tiendas necesitan navegador.
function mergeNotes(existingNotes, kmlNotes) {
  if (kmlNotes && !existingNotes) return kmlNotes;
  return existingNotes;
}

test('el KML rellena las notas de un territorio que no tenia', () => {
  assert.equal(mergeNotes('', 'Comunidades: Arenoso, Los Sanchez.'),
               'Comunidades: Arenoso, Los Sanchez.');
  assert.equal(mergeNotes(undefined, 'Comunidades: El Llano.'), 'Comunidades: El Llano.');
});

test('no pisa las notas escritas a mano', () => {
  const escrito = 'Pasar solo en tiempo seco. Preguntar por el colmado de Tito.';
  assert.equal(mergeNotes(escrito, 'Comunidades: Arenoso.'), escrito);
});

test('un KML sin descripcion deja las notas como estaban', () => {
  assert.equal(mergeNotes('Nota vieja', ''), 'Nota vieja');
  assert.equal(mergeNotes('', ''), '');
});
