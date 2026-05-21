// store.js — Single source of truth for territory data
// All files access via window.App.Store

window.App = window.App || {};

(function () {
  // Demo territories traced along real streets in Centro Histórico, Santiago de los Caballeros
  // Territory 1: Bounded by C/ H.R. Grieser (N), C/ San Francisco de Asís (E), C/ Eliseo Espaillat (S), C/ Loló Pichardo (W)
  // Territory 2: Bounded by C/ Eliseo Espaillat (N), C/ Ulises F. Espaillat (E), C/ Arté (S), C/ Loló Pichardo (W)
  // Territory 3: Bounded by C/ Arté (N), C/ Ulises F. Espaillat (E), C/ Independencia (S), C/ 19 de Marzo (W)
  var SAMPLE_DATA = {
    territories: [
      {
        id: 1, number: '1', name: 'La Joya', group_name: 'Centro',
        polygon: [
          [-70.7142421, 19.4596383], [-70.7140219, 19.4596124], [-70.7136891, 19.4595746],
          [-70.7131125, 19.4595053], [-70.7125173, 19.4594188],
          [-70.7125691, 19.4590277], [-70.7126262, 19.4585969],
          [-70.7132229, 19.4586727], [-70.7138022, 19.4587458], [-70.7143974, 19.4588071]
        ],
        qr_url: '',
        landmarks: [
          { id: 1, name: 'Colmado Mireya', lat: 19.4591, lng: -70.7133, color: '#EF4444' },
          { id: 2, name: 'Panadería Don Luis', lat: 19.4593, lng: -70.7139, color: '#3B82F6' }
        ]
      },
      {
        id: 2, number: '2', name: 'La Trinitaria', group_name: 'Centro',
        polygon: [
          [-70.7143974, 19.4588071], [-70.7138022, 19.4587458], [-70.7132229, 19.4586727],
          [-70.7126262, 19.4585969], [-70.7120424, 19.4585345], [-70.7114533, 19.4584644],
          [-70.7114912, 19.4582499], [-70.7115854, 19.4574568],
          [-70.7121617, 19.4575243], [-70.7127442, 19.4575955], [-70.7133420, 19.4576780],
          [-70.7139401, 19.4577540], [-70.7145103, 19.4578224]
        ],
        qr_url: '',
        landmarks: [
          { id: 1, name: 'Farmacia San Martín', lat: 19.4581, lng: -70.7128, color: '#EF4444' },
          { id: 2, name: 'Escuela Primaria', lat: 19.4580, lng: -70.7136, color: '#8B5CF6' },
          { id: 3, name: 'Cancha', lat: 19.4583, lng: -70.7121, color: '#10B981' }
        ]
      },
      {
        id: 3, number: '3', name: 'Pueblo Nuevo', group_name: 'Centro',
        polygon: [
          [-70.7133420, 19.4576780], [-70.7127442, 19.4575955], [-70.7121617, 19.4575243],
          [-70.7115854, 19.4574568],
          [-70.7117228, 19.4564598], [-70.7118696, 19.4554680], [-70.7119496, 19.4548228],
          [-70.7125257, 19.4548932], [-70.7131270, 19.4549561], [-70.7137009, 19.4550539],
          [-70.7135876, 19.4557333], [-70.7134661, 19.4566536]
        ],
        qr_url: '',
        landmarks: [
          { id: 1, name: 'Mini Market El Punto', lat: 19.4560, lng: -70.7126, color: '#F59E0B' },
          { id: 2, name: 'Cancha Municipal', lat: 19.4566, lng: -70.7130, color: '#10B981' }
        ]
      }
    ]
  };

  var STORAGE_KEY = 'territory-cards-data';
  var data = { territories: [] };
  var listeners = [];
  var defaultCenter = [0, 0];

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* quota exceeded or unavailable */ }
  }

  function notify() {
    persist();
    listeners.forEach(function (fn) { fn(); });
  }

  // Restore from localStorage on load
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      if (parsed.territories && Array.isArray(parsed.territories)) {
        data = parsed;
      }
    }
  } catch (e) { /* ignore parse errors */ }

  function nextId(items) {
    if (items.length === 0) return 1;
    return items.reduce(function (max, i) { return i.id > max ? i.id : max; }, 0) + 1;
  }

  window.App.Store = {
    // Subscribe to changes (returns unsubscribe function)
    onChange: function (fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (f) { return f !== fn; });
      };
    },

    // Load embedded sample data
    loadSample: function () {
      data = JSON.parse(JSON.stringify(SAMPLE_DATA));
      notify();
    },

    // Read
    getAll: function () {
      return data.territories;
    },

    getById: function (id) {
      return data.territories.find(function (t) { return t.id === id; }) || null;
    },

    // Create territory
    createTerritory: function (attrs) {
      var territory = {
        id: nextId(data.territories),
        number: attrs.number || '',
        name: attrs.name || '',
        group_name: attrs.group_name || '',
        polygon: attrs.polygon || [],
        qr_url: attrs.qr_url || '',
        landmarks: []
      };
      data.territories.push(territory);
      notify();
      return territory;
    },

    // Update territory
    updateTerritory: function (id, attrs) {
      var territory = this.getById(id);
      if (!territory) return null;
      if (attrs.number !== undefined) territory.number = attrs.number;
      if (attrs.name !== undefined) territory.name = attrs.name;
      if (attrs.group_name !== undefined) territory.group_name = attrs.group_name;
      if (attrs.polygon !== undefined) territory.polygon = attrs.polygon;
      if (attrs.qr_url !== undefined) territory.qr_url = attrs.qr_url;
      notify();
      return territory;
    },

    // Delete territory
    deleteTerritory: function (id) {
      data.territories = data.territories.filter(function (t) { return t.id !== id; });
      notify();
    },

    // Add landmark to territory
    addLandmark: function (territoryId, attrs) {
      var territory = this.getById(territoryId);
      if (!territory) return null;
      var landmark = {
        id: nextId(territory.landmarks),
        name: attrs.name,
        lat: attrs.lat,
        lng: attrs.lng,
        color: attrs.color || '#3B82F6'
      };
      territory.landmarks.push(landmark);
      notify();
      return landmark;
    },

    // Delete landmark from territory
    deleteLandmark: function (territoryId, landmarkId) {
      var territory = this.getById(territoryId);
      if (!territory) return;
      territory.landmarks = territory.landmarks.filter(function (l) { return l.id !== landmarkId; });
      notify();
    },

    // Load from JSON file (File API)
    loadFromFile: function (file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) {
          try {
            var parsed = JSON.parse(e.target.result);
            if (parsed.territories && Array.isArray(parsed.territories)) {
              // Normalize each territory to ensure required fields exist
              parsed.territories.forEach(function (t) {
                if (typeof t.id !== 'number') t.id = parseInt(t.id, 10) || 0;
                if (!Array.isArray(t.landmarks)) t.landmarks = [];
                if (t.number === undefined) t.number = '';
                if (t.name === undefined) t.name = '';
                if (t.qr_url === undefined) t.qr_url = '';
              });
              data = parsed;
              notify();
              resolve();
            } else {
              reject(new Error('Invalid JSON format: missing territories array'));
            }
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = function () { reject(reader.error); };
        reader.readAsText(file);
      });
    },

    // Save to JSON file (triggers download)
    saveToFile: function () {
      var json = JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.download = 'territories.json';
      link.href = url;
      link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    },

    // Import KML — delegates to App.KmlImport
    importKML: function (file) {
      var self = this;
      return window.App.KmlImport.parse(file).then(function (imported) {
        imported.forEach(function (t) {
          var existing = data.territories.find(function (e) { return e.number === t.number; });
          if (existing) {
            existing.name = t.name;
            existing.group_name = t.group_name;
            existing.polygon = t.polygon;
          } else {
            t.id = nextId(data.territories);
            t.qr_url = '';
            t.landmarks = [];
            data.territories.push(t);
          }
        });
        notify();
      });
    },

    // Reset all data and clear localStorage
    reset: function () {
      data = { territories: [] };
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      notify();
    },

    // Google Maps URL from territory centroid
    googleMapsUrl: function (territory) {
      if (!territory.polygon || territory.polygon.length === 0) return '';
      var lngs = territory.polygon.map(function (c) { return c[0]; });
      var lats = territory.polygon.map(function (c) { return c[1]; });
      var lat = lats.reduce(function (a, b) { return a + b; }, 0) / lats.length;
      var lng = lngs.reduce(function (a, b) { return a + b; }, 0) / lngs.length;
      return 'https://www.google.com/maps/@' + lat + ',' + lng + ',17z';
    },

    // Default map center (set via geolocation)
    setDefaultCenter: function (lat, lng) {
      defaultCenter = [lat, lng];
    },

    getDefaultCenter: function () {
      return defaultCenter;
    },

    // Replace all data (used internally)
    _setData: function (newData) {
      data = newData;
      notify();
    }
  };
})();
