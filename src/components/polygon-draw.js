import L from 'leaflet';
import 'leaflet-draw';
import { getStore } from '../store/index.js';

export function initPolygonDraw(mapContainer, hiddenInput, existingPolygon) {
  const store = getStore();
  const defaultCenter = store.getDefaultCenter();
  const defaultZoom = (defaultCenter[0] === 0 && defaultCenter[1] === 0) ? 2 : 15;
  const map = L.map(mapContainer, { center: defaultCenter, zoom: defaultZoom });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
  }).addTo(map);

  const drawnItems = new L.FeatureGroup().addTo(map);

  if (existingPolygon && existingPolygon.length >= 3) {
    const coords = existingPolygon.map(function (c) { return [c[1], c[0]]; });
    const polygon = L.polygon(coords, {
      color: '#1E40AF',
      weight: 2,
      fillColor: '#1E40AF',
      fillOpacity: 0.2
    });
    drawnItems.addLayer(polygon);
    map.fitBounds(polygon.getBounds());
    serializeToField();
  }

  const drawControl = new L.Control.Draw({
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
    const layers = drawnItems.getLayers();
    if (layers.length === 0) {
      hiddenInput.value = '[]';
      return;
    }
    const latlngs = layers[0].getLatLngs()[0];
    const coords = latlngs.map(function (ll) { return [ll.lng, ll.lat]; });
    hiddenInput.value = JSON.stringify(coords);
  }

  return function () { map.remove(); };
}
