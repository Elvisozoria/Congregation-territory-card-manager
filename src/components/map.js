import L from 'leaflet';
import { getStore } from '../store/index.js';
import { escapeHtml } from '../utils/helpers.js';

const TERRITORY_COLORS = ['#1E40AF', '#B91C1C', '#047857', '#7C3AED', '#B45309', '#BE185D'];

export function renderOverviewMap(container, territories) {
  const store = getStore();
  const defaultCenter = store.getDefaultCenter();
  const defaultZoom = (defaultCenter[0] === 0 && defaultCenter[1] === 0) ? 2 : 15;
  const map = L.map(container, { center: defaultCenter, zoom: defaultZoom });

  const osm = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
  }).addTo(map);

  const satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri' }
  );

  const hybrid = L.layerGroup([
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri' }
    ),
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', { opacity: 0.7 })
  ]);

  L.control.layers({ 'Street': osm, 'Satellite': satellite, 'Hybrid': hybrid }).addTo(map);

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
  }

  return function () { map.remove(); };
}

export function renderSingleMap(container, territory, onMapClick, onMapReady) {
  const store = getStore();
  const defaultCenter = store.getDefaultCenter();
  const defaultZoom = (defaultCenter[0] === 0 && defaultCenter[1] === 0) ? 2 : 15;
  const map = L.map(container, { center: defaultCenter, zoom: defaultZoom });

  const osm = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
  }).addTo(map);

  const satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri' }
  );

  const hybrid = L.layerGroup([
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri' }
    ),
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', { opacity: 0.7 })
  ]);

  L.control.layers({ 'Street': osm, 'Satellite': satellite, 'Hybrid': hybrid }).addTo(map);

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
