// store.js — Single source of truth for territory data
// All files access via window.App.Store

window.App = window.App || {};

(function () {
  var SAMPLE_DATA = {
    territories: [
      {
        id: 1, number: '1', name: 'Villa Olga Norte', group_name: 'Sur',
        polygon: [
          [-70.6891, 19.4530], [-70.6885, 19.4533], [-70.6878, 19.4529],
          [-70.6874, 19.4524], [-70.6871, 19.4518], [-70.6876, 19.4514],
          [-70.6882, 19.4511], [-70.6889, 19.4513], [-70.6893, 19.4517],
          [-70.6895, 19.4523], [-70.6894, 19.4527]
        ],
        qr_url: '',
        landmarks: [
          { id: 1, name: 'Colmado Don Pedro', lat: 19.4522, lng: -70.6884, color: '#EF4444' },
          { id: 2, name: 'Iglesia Adventista', lat: 19.4518, lng: -70.6878, color: '#3B82F6' },
          { id: 3, name: 'Cancha', lat: 19.4526, lng: -70.6888, color: '#10B981' }
        ]
      },
      {
        id: 2, number: '2', name: 'Reparto Universitario', group_name: 'Sur',
        polygon: [
          [-70.6871, 19.4518], [-70.6874, 19.4524], [-70.6878, 19.4529],
          [-70.6870, 19.4534], [-70.6862, 19.4531], [-70.6856, 19.4527],
          [-70.6853, 19.4521], [-70.6855, 19.4515], [-70.6860, 19.4510],
          [-70.6866, 19.4512], [-70.6870, 19.4515]
        ],
        qr_url: '',
        landmarks: [
          { id: 1, name: 'Farmacia Carol', lat: 19.4520, lng: -70.6863, color: '#EF4444' },
          { id: 2, name: 'Escuela Basica', lat: 19.4525, lng: -70.6868, color: '#8B5CF6' }
        ]
      },
      {
        id: 3, number: '3', name: 'Los Jardines', group_name: 'Sur',
        polygon: [
          [-70.6895, 19.4523], [-70.6893, 19.4517], [-70.6896, 19.4511],
          [-70.6900, 19.4506], [-70.6907, 19.4504], [-70.6913, 19.4507],
          [-70.6916, 19.4513], [-70.6914, 19.4519], [-70.6910, 19.4524],
          [-70.6904, 19.4527], [-70.6898, 19.4526]
        ],
        qr_url: '',
        landmarks: [
          { id: 1, name: 'Super Mercado', lat: 19.4515, lng: -70.6906, color: '#F59E0B' }
        ]
      }
    ]
  };

  var data = { territories: [] };
  var listeners = [];
  var defaultCenter = [0, 0];

  function notify() {
    listeners.forEach(function (fn) { fn(); });
  }

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
