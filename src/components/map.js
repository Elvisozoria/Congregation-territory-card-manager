import L from 'leaflet';
import { getStore } from '../store/index.js';
import { escapeHtml } from '../utils/helpers.js';
import { parseCoordString } from '../utils/kml-import.js';
import { t } from '../i18n/i18n.js';
import { baseLayers } from './tiles.js';

const TERRITORY_COLORS = ['#1E40AF', '#B91C1C', '#047857', '#7C3AED', '#B45309', '#BE185D'];

// Contorno de la congregación, sin relleno para no tapar los territorios.
// Devuelve null si no hay límite cargado.
export function buildBoundaryLayer() {
  const store = getStore();
  const boundary = store.getBoundary ? store.getBoundary() : null;
  if (!boundary || !boundary.coords) return null;

  const coords = parseCoordString(boundary.coords).map(function (c) { return [c[1], c[0]]; });
  if (coords.length < 3) return null;

  return L.polygon(coords, {
    color: '#DC2626',
    weight: 2,
    dashArray: '6 4',
    fill: false,
    interactive: false
  });
}

// El control de capas de Leaflet ya da la casilla de encender y apagar, así que
// el interruptor de "ver límite" no se construye a mano.
function addBoundaryOverlay(map, bases) {
  const boundaryLayer = buildBoundaryLayer();
  const overlays = {};
  if (boundaryLayer) {
    overlays[t('map.boundaryLayer')] = boundaryLayer;
    boundaryLayer.addTo(map);
  }
  L.control.layers(bases, overlays).addTo(map);
  return boundaryLayer;
}

export function renderOverviewMap(container, territories) {
  const store = getStore();
  const defaultCenter = store.getDefaultCenter();
  const defaultZoom = (defaultCenter[0] === 0 && defaultCenter[1] === 0) ? 2 : 15;
  // zoomSnap 0 permite zoom fraccionado: sin esto fitBounds baja al entero
  // inferior y deja los territorios pequenos en medio de un mapa muy abierto.
  const map = L.map(container, { center: defaultCenter, zoom: defaultZoom, zoomSnap: 0 });

  const bases = baseLayers();
  bases['Street'].addTo(map);

  const boundaryLayer = addBoundaryOverlay(map, bases);

  const bounds = [];

  territories.forEach(function (territory, index) {
    if (!territory.polygon || territory.polygon.length < 3) return;

    const color = TERRITORY_COLORS[index % TERRITORY_COLORS.length];
    const coords = territory.polygon.map(function (c) { return [c[1], c[0]]; });

    const polygon = L.polygon(coords, {
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.2
    }).addTo(map);

    const center = polygon.getBounds().getCenter();
    const labelIcon = L.divIcon({
      className: '',
      html: '<span class="map-label">' + escapeHtml(territory.number) + ' - ' + escapeHtml(territory.name) + '</span>',
      iconSize: null,
      iconAnchor: null
    });
    L.marker(center, { icon: labelIcon, interactive: false, keyboard: false }).addTo(map);

    polygon.on('click', function () { window.location.hash = '#/territories/' + territory.id; });
    polygon.on('mouseover', function () { this.setStyle({ fillOpacity: 0.4 }); });
    polygon.on('mouseout', function () { this.setStyle({ fillOpacity: 0.2 }); });

    coords.forEach(function (c) { bounds.push(c); });
  });

  if (bounds.length > 0) {
    map.fitBounds(L.latLngBounds(bounds));
  } else if (boundaryLayer) {
    // Sin territorios dibujados todavía, el límite es lo único que hay que ver.
    map.fitBounds(boundaryLayer.getBounds());
  }

  return function () { map.remove(); };
}

export function renderSingleMap(container, territory, onMapClick, onMapReady) {
  const store = getStore();
  const defaultCenter = store.getDefaultCenter();
  const defaultZoom = (defaultCenter[0] === 0 && defaultCenter[1] === 0) ? 2 : 15;
  // zoomSnap 0 permite zoom fraccionado: sin esto fitBounds baja al entero
  // inferior y deja los territorios pequenos en medio de un mapa muy abierto.
  const map = L.map(container, { center: defaultCenter, zoom: defaultZoom, zoomSnap: 0 });

  const bases = baseLayers();
  bases['Street'].addTo(map);

  addBoundaryOverlay(map, bases);

  if (territory.polygon && territory.polygon.length >= 3) {
    const coords = territory.polygon.map(function (c) { return [c[1], c[0]]; });

    L.polygon(coords, {
      color: '#1E40AF',
      weight: 3,
      fillColor: '#1E40AF',
      fillOpacity: 0.15
    }).addTo(map);

    map.fitBounds(L.latLngBounds(coords));
  }

  const landmarks = territory.landmarks || [];
  landmarks.forEach(function (landmark) {
    const marker = L.circleMarker([landmark.lat, landmark.lng], {
      radius: 8,
      fillColor: landmark.color || '#3B82F6',
      color: '#1F2937',
      weight: 2,
      fillOpacity: 1
    }).addTo(map);

    marker.bindTooltip(landmark.name, {
      permanent: true,
      direction: 'right',
      offset: [10, 0],
      className: 'landmark-tooltip'
    });
  });

  if (onMapClick) {
    map.on('click', function (e) { onMapClick(e.latlng); });
  }

  if (onMapReady) {
    onMapReady(map);
  }

  return function () { map.remove(); };
}
