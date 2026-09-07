// Etiquetas de territorio. Son una simple lista de textos guardada en el
// territorio: no hay colección de etiquetas ni administración de las mismas.
// El catálogo se deriva contando las que ya están en uso, así que no existen
// etiquetas huérfanas ni referencias que sincronizar.
//
// ponytail: el precio de esto es que renombrar una etiqueta toca todos los
// territorios que la usan, y que no hay color ni descripción por etiqueta. El
// día que alguna de las dos cosas haga falta de verdad, se promueve a colección.

// Limpia, quita vacíos y colapsa duplicados sin distinguir mayúsculas,
// conservando la primera forma escrita.
export function normalizeTags(value) {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  const seen = new Set();
  const out = [];

  raw.forEach(function (tag) {
    const clean = String(tag == null ? '' : tag).trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  });

  return out;
}

// Etiquetas de un territorio. Un territorio guardado antes de esta versión
// trae group_name y ninguna etiqueta: ese grupo pasa a ser su primera etiqueta,
// para que nada se pierda y lo viejo siga funcionando.
export function territoryTags(territory) {
  if (!territory) return [];
  const tags = normalizeTags(territory.tags);
  if (tags.length > 0) return tags;
  return normalizeTags(territory.group_name);
}

// Catálogo de etiquetas en uso, ordenado para mostrar.
export function allTags(territories) {
  const byKey = new Map();

  (territories || []).forEach(function (territory) {
    territoryTags(territory).forEach(function (tag) {
      const key = tag.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, tag);
    });
  });

  return Array.from(byKey.values()).sort(function (a, b) { return a.localeCompare(b); });
}

// Filtro: se acumulan condiciones, el territorio debe tener todas las
// etiquetas marcadas. Cruzar dimensiones es el motivo de existir del filtro.
export function matchesTags(territory, selected) {
  if (!selected || selected.length === 0) return true;
  const own = territoryTags(territory).map(function (tag) { return tag.toLowerCase(); });
  return selected.every(function (tag) { return own.indexOf(String(tag).toLowerCase()) !== -1; });
}

// Texto separado por comas a lista de etiquetas.
export function parseTagsInput(text) {
  return normalizeTags(String(text == null ? '' : text).split(','));
}

export function formatTagsInput(tags) {
  return normalizeTags(tags).join(', ');
}
