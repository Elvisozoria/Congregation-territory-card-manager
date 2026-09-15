import L from 'leaflet';
import { baseLayer } from './tiles.js';
import { normalizeStyle } from '../utils/map-style.js';
import QRCode from 'qrcode';
import { escapeHtml } from '../utils/helpers.js';
import { t } from '../i18n/i18n.js';

const WORLD_BOUNDS = [[90, -180], [90, 180], [-90, 180], [-90, -180]];

// options: { editable, qrUrl, onViewChange, style }
// style: apariencia de la congregación (ver utils/map-style.js); el territorio
// puede fijar su propia capa base en cardLayer.
// Devuelve: { cleanup, getView, setView, resetView, getMap }
export function renderCardMap(cardElement, territory, globalLandmarks, options) {
  const opts = options || {};
  const mapDiv = cardElement.querySelector('.card-map') || cardElement;
  const editable = !!opts.editable;
  const style = normalizeStyle(opts.style);

  // Pasos de zoom más finos al ajustar la vista para impresión.
  // Antes cada paso era 1 nivel completo de Leaflet (saltos bruscos);
  // ahora cada paso es 1/3 de nivel para un encuadre más preciso.
  // Se aplica también en modo no editable para que el zoom fraccionado
  // guardado (cardZoom) se respete al renderizar la tarjeta impresa.
  const ZOOM_STEP = 1 / 3;

  const map = L.map(mapDiv, {
    zoomControl: editable,
    zoomSnap: ZOOM_STEP,
    zoomDelta: ZOOM_STEP,
    attributionControl: false,
    dragging: editable,
    scrollWheelZoom: editable,
    doubleClickZoom: editable,
    touchZoom: editable,
    keyboard: editable,
    boxZoom: editable
  });

  baseLayer(territory.cardLayer || style.base).addTo(map);

  // Casas aproximadas impresas en la tarjeta, si el territorio lo tiene
  // activado. Se pinta aquí y no en cada vista para que la tarjeta suelta y la
  // hoja de impresión salgan iguales.
  if (territory.showHouses && territory.houses) {
    const houses = document.createElement('div');
    houses.className = 'card-houses';
    // Estilo en línea como el número y el QR de la tarjeta: html-to-image
    // exporta el PNG a partir del nodo, y ahí las reglas de la hoja externa no
    // siempre viajan con él.
    houses.style.cssText = 'position:absolute;top:8px;right:8px;z-index:1000;' +
      'background:rgba(255,255,255,0.9);color:#1F2937;padding:3px 7px;' +
      'border-radius:4px;font-size:0.75rem;font-weight:600;';
    houses.textContent = t('card.housesBadge', { count: territory.houses });
    cardElement.appendChild(houses);
  }

  let defaultBounds = null;

  if (territory.polygon && territory.polygon.length >= 3) {
    const coords = territory.polygon.map(function (c) { return [c[1], c[0]]; });

    L.polygon(coords, {
      color: style.outlineColor,
      weight: style.outlineWeight,
      fillColor: style.outlineColor,
      fillOpacity: style.fill / 100
    }).addTo(map);

    // Vela lo de fuera del territorio para que la vista no distraiga. Era un
    // velo blanco al 20%, que sobre el mapa claro no se distinguía de lo de
    // dentro: blanco sobre blanco. Gris claro, y cuánto lo decide cada
    // congregación (a 0 no se pinta).
    if (style.veil > 0) {
      L.polygon([WORLD_BOUNDS, coords], {
        color: 'none',
        fillColor: '#F3F4F6',
        fillOpacity: style.veil / 100,
        stroke: false
      }).addTo(map);
    }

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

  // La muestra de Configuración destruye y rehace el mapa a cada ajuste; si
  // el nodo ya no existe cuando salta este temporizador, Leaflet revienta.
  let removed = false;
  setTimeout(function () {
    if (removed) return;
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
        '<span style="background:rgba(0,0,0,0.7);color:white;padding:1px 4px;font-size:' + style.labelSize + 'px;border-radius:2px;white-space:nowrap;">' + escapeHtml(landmark.name) + '</span>' +
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
        '<span style="background:rgba(0,0,0,0.7);color:white;padding:1px 4px;font-size:' + style.labelSize + 'px;border-radius:2px;white-space:nowrap;">' + escapeHtml(landmark.name) + '</span>' +
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
      html: '<span style="background:rgba(245,158,11,0.85);color:white;padding:0 4px;font-size:' + style.labelSize + 'px;font-weight:bold;border-radius:2px;">' + escapeHtml(block.number) + '</span>',
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
    cleanup: function () { removed = true; map.stop(); map.remove(); },
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
