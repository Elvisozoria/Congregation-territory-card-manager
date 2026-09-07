import L from 'leaflet';
import 'leaflet-draw';
import { getStore } from '../store/index.js';
import { streetLayer } from './tiles.js';
import { buildBoundaryLayer } from './map.js';
import { t } from '../i18n/i18n.js';

export function initPolygonDraw(mapContainer, hiddenInput, existingPolygon) {
  const store = getStore();
  const defaultCenter = store.getDefaultCenter();
  const defaultZoom = (defaultCenter[0] === 0 && defaultCenter[1] === 0) ? 2 : 15;
  const map = L.map(mapContainer, { center: defaultCenter, zoom: defaultZoom });

  streetLayer().addTo(map);

  // Dibujar es donde más sirve ver el límite, sobre todo en una congregación
  // que está trazando sus territorios por primera vez. No restringe nada.
  const boundaryLayer = buildBoundaryLayer();
  if (boundaryLayer) {
    boundaryLayer.addTo(map);
    const overlays = {};
    overlays[t('map.boundaryLayer')] = boundaryLayer;
    L.control.layers(null, overlays).addTo(map);
  }

  const drawnItems = new L.FeatureGroup().addTo(map);

  // Territorio nuevo y sin centro guardado: encuadrar el límite. Si no, la
  // primera congregación que dibuja abre el mapa en vista mundial.
  const hasExisting = existingPolygon && existingPolygon.length >= 3;
  if (!hasExisting && boundaryLayer) {
    map.fitBounds(boundaryLayer.getBounds());
  }

  if (hasExisting) {
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
