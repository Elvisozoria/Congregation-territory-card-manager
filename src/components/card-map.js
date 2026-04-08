import L from 'leaflet';
import QRCode from 'qrcode';
import { escapeHtml } from '../utils/helpers.js';

const WORLD_BOUNDS = [[90, -180], [90, 180], [-90, 180], [-90, -180]];

export function renderCardMap(cardElement, territory) {
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
      fillOpacity: 0.75,
      stroke: false
    }).addTo(map);

    map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
  }

  const landmarks = territory.landmarks || [];
  landmarks.forEach(function (landmark) {
    const marker = L.circleMarker([landmark.lat, landmark.lng], {
      radius: 6,
      fillColor: landmark.color || '#3B82F6',
      color: '#1F2937',
      weight: 1.5,
      fillOpacity: 1
    }).addTo(map);

    marker.bindTooltip(landmark.name, {
      permanent: true,
      direction: 'right',
      offset: [8, 0],
      className: 'landmark-tooltip'
    });
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
