import L from 'leaflet';
import QRCode from 'qrcode';
import { escapeHtml } from '../utils/helpers.js';

const WORLD_BOUNDS = [[90, -180], [90, 180], [-90, 180], [-90, -180]];

// options: { editable, qrUrl, onViewChange }
// Devuelve: { cleanup, getView, setView, resetView, getMap }
export function renderCardMap(cardElement, territory, globalLandmarks, options) {
  const opts = options || {};
  const mapDiv = cardElement.querySelector('.card-map') || cardElement;
  const editable = !!opts.editable;

  const map = L.map(mapDiv, {
    zoomControl: editable,
    attributionControl: false,
    dragging: editable,
    scrollWheelZoom: editable,
    doubleClickZoom: editable,
    touchZoom: editable,
    keyboard: editable,
    boxZoom: editable
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

  let defaultBounds = null;

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

    defaultBounds = L.latLngBounds(coords);
  }

  // Vista guardada vs default
  function applyDefaultView() {
    if (defaultBounds) {
      map.fitBounds(defaultBounds, { padding: [30, 30] });
    } else {
      map.setView([0, 0], 2);
    }
  }

  if (territory.cardCenter && typeof territory.cardZoom === 'number') {
    map.setView([territory.cardCenter.lat, territory.cardCenter.lng], territory.cardZoom);
  } else {
    applyDefaultView();
  }

  setTimeout(function () {
    map.invalidateSize();
    if (!(territory.cardCenter && typeof territory.cardZoom === 'number')) {
      applyDefaultView();
    }
  }, 200);

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

  const qrContainer = cardElement.querySelector('[data-qr-url]');
  const qrUrl = opts.qrUrl || (qrContainer && qrContainer.dataset.qrUrl) || '';
  if (qrContainer && qrUrl) {
    QRCode.toCanvas(qrUrl, {
      width: 60,
      margin: 0,
      color: { dark: '#000000', light: '#ffffff' }
    }).then(function (canvas) {
      canvas.style.display = 'block';
      qrContainer.innerHTML = '';
      qrContainer.appendChild(canvas);
    }).catch(function (err) {
      console.error('QR generation failed:', err);
    });
  }

  if (editable && typeof opts.onViewChange === 'function') {
    map.on('moveend', function () {
      opts.onViewChange({
        zoom: map.getZoom(),
        center: { lat: map.getCenter().lat, lng: map.getCenter().lng }
      });
    });
  }

  return {
    cleanup: function () { map.remove(); },
    getView: function () {
      return { zoom: map.getZoom(), center: { lat: map.getCenter().lat, lng: map.getCenter().lng } };
    },
    setView: function (zoom, center) {
      map.setView([center.lat, center.lng], zoom);
    },
    resetView: applyDefaultView,
    getMap: function () { return map; }
  };
}
