// store.js — Single source of truth for territory data
// All files access via window.App.Store

window.App = window.App || {};

(function () {
  var SAMPLE_DATA = {
    territories: [
      {
        id: 1, number: '1', name: 'Los Prados', group_name: 'Oeste',
        polygon: [[-70.710, 19.502], [-70.705, 19.502], [-70.705, 19.498], [-70.710, 19.498]],
        qr_url: '',
        landmarks: [
          { id: 1, name: 'Pharmacy', lat: 19.501, lng: -70.708, color: '#EF4444' },
          { id: 2, name: 'School', lat: 19.500, lng: -70.706, color: '#3B82F6' }
        ]
      },
      {
        id: 2, number: '2', name: 'La Mina', group_name: 'Este',
        polygon: [[-70.700, 19.505], [-70.695, 19.505], [-70.695, 19.500], [-70.700, 19.500]],
        qr_url: '',
        landmarks: []
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
    // Subscribe to changes
    onChange: function (fn) {
      listeners.push(fn);
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
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },

    // Import KML — delegates to App.KmlImport
    importKML: function (file) {
      var self = this;
      return App.KmlImport.parse(file).then(function (imported) {
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
