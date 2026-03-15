// polygon-draw.js — Leaflet.draw wrapper for territory form

window.App = window.App || {};
window.App.Components = window.App.Components || {};

(function () {
  // Initialize polygon drawing on a map container
  // hiddenInput: the hidden input element to store polygon JSON
  // existingPolygon: array of [lng, lat] coords or empty array
  // Returns cleanup function
  function initPolygonDraw(mapContainer, hiddenInput, existingPolygon) {
    var defaultCenter = App.Store.getDefaultCenter ? App.Store.getDefaultCenter() : [0, 0];
    var defaultZoom = (defaultCenter[0] === 0 && defaultCenter[1] === 0) ? 2 : 15;
    var map = L.map(mapContainer, { center: defaultCenter, zoom: defaultZoom });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);

    var drawnItems = new L.FeatureGroup().addTo(map);

    // Load existing polygon when editing
    if (existingPolygon && existingPolygon.length >= 3) {
      var coords = existingPolygon.map(function (c) { return [c[1], c[0]]; });
      var polygon = L.polygon(coords, {
        color: '#1E40AF',
        weight: 2,
        fillColor: '#1E40AF',
        fillOpacity: 0.2
      });
      drawnItems.addLayer(polygon);
      map.fitBounds(polygon.getBounds());
      serializeToField();
    }

    var drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          shapeOptions: {
            color: '#1E40AF',
            weight: 2,
            fillColor: '#1E40AF',
            fillOpacity: 0.2
          },
          allowIntersection: false,
          showArea: false
        },
        marker: false,
        circle: false,
        rectangle: false,
        polyline: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    }).addTo(map);

    map.on(L.Draw.Event.CREATED, function (e) {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      serializeToField();
    });

    map.on(L.Draw.Event.EDITED, function () { serializeToField(); });
    map.on(L.Draw.Event.DELETED, function () { serializeToField(); });

    function serializeToField() {
      var layers = drawnItems.getLayers();
      if (layers.length === 0) {
        hiddenInput.value = '[]';
        return;
      }
      var latlngs = layers[0].getLatLngs()[0];
      var coords = latlngs.map(function (ll) { return [ll.lng, ll.lat]; });
      hiddenInput.value = JSON.stringify(coords);
    }

    return function () { map.remove(); };
  }

  window.App.Components.PolygonDraw = {
    init: initPolygonDraw
  };
})();
