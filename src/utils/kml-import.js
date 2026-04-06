import JSZip from 'jszip';

export function parse(file) {
  if (file.name.toLowerCase().endsWith('.kmz')) {
    return parseKMZ(file);
  }
  return parseKMLFile(file);
}

function parseKMLFile(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        resolve(parseKMLString(e.target.result));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = function () { reject(reader.error); };
    reader.readAsText(file);
  });
}

function parseKMZ(file) {
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
      }).then(function (kmlString) {
        resolve(parseKMLString(kmlString));
      }).catch(reject);
    };
    reader.onerror = function () { reject(reader.error); };
    reader.readAsArrayBuffer(file);
  });
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

  const coordsText = coordsEl.textContent.trim();
  const polygon = [];

  coordsText.split(/\s+/).forEach(function (triplet) {
    const parts = triplet.split(',');
    if (parts.length < 2) return;
    const lng = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    if (!isNaN(lng) && !isNaN(lat)) {
      polygon.push([lng, lat]);
    }
  });

  if (polygon.length < 3) return null;

  // Strip closing ring point (KML repeats first coord as last)
  const first = polygon[0], last = polygon[polygon.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) polygon.pop();

  return { number, name: fullName, group_name: groupName, polygon };
}
