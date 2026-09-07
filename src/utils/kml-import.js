import JSZip from 'jszip';

// Lee el texto XML de un .kml o del primer .kml dentro de un .kmz.
function readKmlText(file) {
  if (file.name.toLowerCase().endsWith('.kmz')) {
    return readKmzText(file);
  }
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) { resolve(e.target.result); };
    reader.onerror = function () { reject(reader.error); };
    reader.readAsText(file);
  });
}

function readKmzText(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) {
      JSZip.loadAsync(e.target.result).then(function (zip) {
        let kmlFile = null;
        zip.forEach(function (path, entry) {
          if (path.toLowerCase().endsWith('.kml') && !kmlFile) {
            kmlFile = entry;
          }
        });
        if (!kmlFile) throw new Error('No .kml file found inside KMZ archive');
        return kmlFile.async('string');
      }).then(resolve).catch(reject);
    };
    reader.onerror = function () { reject(reader.error); };
    reader.readAsArrayBuffer(file);
  });
}

export function parse(file) {
  return readKmlText(file).then(parseKMLString);
}

// Límite de la congregación: un solo polígono, el que da la sucursal.
export function parseBoundary(file) {
  return readKmlText(file).then(parseBoundaryString);
}

// Convierte el texto de <coordinates> en pares [lng, lat].
// Descarta altitud y basura, y quita el punto de cierre que repite el primero.
// Exportada aparte porque es la única lógica con filo y así se puede probar
// sin DOM (el límite de una congregación trae más de mil puntos).
export function parseCoordString(coordsText) {
  const coords = [];
  if (!coordsText) return coords;

  coordsText.trim().split(/\s+/).forEach(function (triplet) {
    const parts = triplet.split(',');
    if (parts.length < 2) return;
    const lng = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    if (!isNaN(lng) && !isNaN(lat)) {
      coords.push([lng, lat]);
    }
  });

  if (coords.length > 1) {
    const first = coords[0], last = coords[coords.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) coords.pop();
  }

  return coords;
}

function parseKMLString(kmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'text/xml');
  const territories = [];

  const folders = doc.querySelectorAll('Folder');

  if (folders.length === 0) {
    const placemarks = doc.querySelectorAll('Placemark');
    placemarks.forEach(function (pm) {
      const t = parsePlacemark(pm, '');
      if (t) territories.push(t);
    });
  } else {
    folders.forEach(function (folder) {
      const nameEl = folder.querySelector(':scope > name');
      const groupName = nameEl ? nameEl.textContent.trim() : '';

      const placemarks = folder.querySelectorAll(':scope > Placemark');
      placemarks.forEach(function (pm) {
        const t = parsePlacemark(pm, groupName);
        if (t) territories.push(t);
      });
    });
  }

  return territories;
}

// El KML de la sucursal trae los cuatro linderos escritos en <Data>. Eso es lo
// que uno consulta cuando duda si una casa entra o no, así que se guarda igual
// que la geometría.
function parseBoundaryString(kmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'text/xml');

  const placemark = doc.querySelector('Placemark');
  if (!placemark) throw new Error('boundary.empty');

  const coordsEl = placemark.querySelector('coordinates');
  if (!coordsEl) throw new Error('boundary.empty');

  const coordsText = coordsEl.textContent.trim().replace(/\s+/g, ' ');
  if (parseCoordString(coordsText).length < 3) throw new Error('boundary.empty');

  const nameEl = placemark.querySelector('name');
  const data = {};
  placemark.querySelectorAll('Data').forEach(function (el) {
    const key = el.getAttribute('name');
    const valueEl = el.querySelector('value');
    if (key && valueEl) data[key] = valueEl.textContent.trim();
  });

  return {
    name: nameEl ? nameEl.textContent.trim() : '',
    coords: coordsText,
    updated: data.LastUpdated || '',
    borders: {
      north: data.BorderNorth || '',
      east: data.BorderEast || '',
      south: data.BorderSouth || '',
      west: data.BorderWest || ''
    }
  };
}

function parsePlacemark(placemark, groupName) {
  const nameEl = placemark.querySelector('name');
  const rawName = nameEl ? nameEl.textContent.trim() : '';
  if (!rawName) return null;

  const tokens = rawName.split(/\s+(.+)/);
  const number = tokens[0];
  let fullName = (tokens[1] || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (!fullName) fullName = number;

  const coordsEl = placemark.querySelector('coordinates');
  if (!coordsEl) return null;

  const polygon = parseCoordString(coordsEl.textContent);
  if (polygon.length < 3) return null;

  // La carpeta del KML pasa a ser una etiqueta del territorio.
  return { number, name: fullName, tags: groupName ? [groupName] : [], polygon };
}
