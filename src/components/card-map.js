import L from 'leaflet';
import QRCode from 'qrcode';
import { escapeHtml } from '../utils/helpers.js';

const WORLD_BOUNDS = [[90, -180], [90, 180], [-90, 180], [-90, -180]];

export function renderCardMap(cardElement, territory, globalLandmarks) {
  const mapDiv = cardElement.querySelector('.card-map') || cardElement;

  const map = L.map(mapDiv, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    keyboard: false,
    boxZoom: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

  if (territory.polygon && territory.polygon.length >= 3) {
    const coords = territory.polygon.map(function (c) { return [c[1], c[0]]; });

    L.polygon(coords, {
      color: '#1E40AF',
      weight: 3,
      fillOpacity: 0
    }).addTo(map);

    L.polygon([WORLD_BOUNDS, coords], {
      color: 'none',
      fillColor: 'white',
      fillOpacity: 0.20,
      stroke: false
    }).addTo(map);

    var bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [30, 30] });

    setTimeout(function () {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [30, 30] });
    }, 200);
  }

  const landmarks = territory.landmarks || [];
  landmarks.forEach(function (landmark) {
    var color = landmark.color || '#3B82F6';
    var icon = L.divIcon({
      className: '',
      html: '<span style="display:inline-flex;align-items:center;gap:4px;">' +
        '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + color + ';border:1.5px solid #1F2937;"></span>' +
        '<span style="background:rgba(0,0,0,0.7);color:white;padding:1px 4px;font-size:9px;border-radius:2px;white-space:nowrap;">' + escapeHtml(landmark.name) + '</span>' +
        '</span>',
      iconSize: null,
      iconAnchor: [5, 5]
    });
    L.marker([landmark.lat, landmark.lng], { icon: icon, interactive: false }).addTo(map);
  });

  // Global landmarks
  (globalLandmarks || []).forEach(function (landmark) {
    var icon = L.divIcon({
      className: '',
      html: '<span style="display:inline-flex;align-items:center;gap:4px;">' +
        '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#9CA3AF;border:1.5px solid #6B7280;"></span>' +
        '<span style="background:rgba(0,0,0,0.7);color:white;padding:1px 4px;font-size:9px;border-radius:2px;white-space:nowrap;">' + escapeHtml(landmark.name) + '</span>' +
        '</span>',
      iconSize: null,
      iconAnchor: [5, 5]
    });
    L.marker([landmark.lat, landmark.lng], { icon: icon, interactive: false }).addTo(map);
  });

  // Draw blocks (manzanas) as point labels
  const blocks = territory.blocks || [];
  blocks.forEach(function (block) {
    if (!block.lat || !block.lng) return;
    const bLabel = L.divIcon({
      className: '',
      html: '<span style="background:rgba(245,158,11,0.85);color:white;padding:0 4px;font-size:9px;font-weight:bold;border-radius:2px;">' + escapeHtml(block.number) + '</span>',
      iconSize: null
    });
    L.marker([block.lat, block.lng], { icon: bLabel, interactive: false }).addTo(map);
  });

  // Generate QR code
  const qrContainer = cardElement.querySelector('[data-qr-url]');
  if (qrContainer && qrContainer.dataset.qrUrl) {
    QRCode.toCanvas(qrContainer.dataset.qrUrl, {
      width: 60,
      margin: 0,
      color: { dark: '#000000', light: '#ffffff' }
    }).then(function (canvas) {
      canvas.style.display = 'block';
      qrContainer.appendChild(canvas);
    }).catch(function (err) {
      console.error('QR generation failed:', err);
    });
  }

  return function () { map.remove(); };
}
