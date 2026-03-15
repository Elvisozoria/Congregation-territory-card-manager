// kml-import.js — Parse KML/KMZ files into territory objects

window.App = window.App || {};

(function () {
  // Parse a KML or KMZ file
  // Returns Promise<Array<{number, name, group_name, polygon}>>
  function parse(file) {
    if (file.name.toLowerCase().endsWith('.kmz')) {
      return parseKMZ(file);
    }
    return parseKMLFile(file);
  }

  function parseKMLFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var territories = parseKMLString(e.target.result);
          resolve(territories);
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
      var reader = new FileReader();
      reader.onload = function (e) {
        JSZip.loadAsync(e.target.result).then(function (zip) {
          var kmlFile = null;
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
    var parser = new DOMParser();
    var doc = parser.parseFromString(kmlText, 'text/xml');
    var territories = [];

    var folders = doc.querySelectorAll('Folder');

    if (folders.length === 0) {
      // No folders — parse placemarks at root level
      var placemarks = doc.querySelectorAll('Placemark');
      placemarks.forEach(function (pm) {
        var t = parsePlacemark(pm, '');
        if (t) territories.push(t);
      });
    } else {
      folders.forEach(function (folder) {
        var nameEl = folder.querySelector(':scope > name');
        var groupName = nameEl ? nameEl.textContent.trim() : '';

        var placemarks = folder.querySelectorAll(':scope > Placemark');
        placemarks.forEach(function (pm) {
          var t = parsePlacemark(pm, groupName);
          if (t) territories.push(t);
        });
      });
    }

    return territories;
  }

  function parsePlacemark(placemark, groupName) {
    var nameEl = placemark.querySelector('name');
    var rawName = nameEl ? nameEl.textContent.trim() : '';
    if (!rawName) return null;

    // Extract number and name: "1 prados" or "10 la mina (dividir)"
    var tokens = rawName.split(/\s+(.+)/);
    var number = tokens[0];
    var fullName = (tokens[1] || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
    if (!fullName) fullName = number;

    var coordsEl = placemark.querySelector('coordinates');
    if (!coordsEl) return null;

    var coordsText = coordsEl.textContent.trim();
    var polygon = [];

    coordsText.split(/\s+/).forEach(function (triplet) {
      var parts = triplet.split(',');
      if (parts.length < 2) return;
      var lng = parseFloat(parts[0]);
      var lat = parseFloat(parts[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        polygon.push([lng, lat]);
      }
    });

    if (polygon.length < 3) return null;

    // Strip closing ring point (KML repeats first coord as last)
    var first = polygon[0], last = polygon[polygon.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) polygon.pop();

    return {
      number: number,
      name: fullName,
      group_name: groupName,
      polygon: polygon
    };
  }

  window.App.KmlImport = {
    parse: parse
  };
})();
