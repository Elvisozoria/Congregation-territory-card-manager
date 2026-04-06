import L from 'leaflet';
import QRCode from 'qrcodejs2';

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

  // Generate QR code
  const qrContainer = cardElement.querySelector('[data-qr-url]');
  if (qrContainer && qrContainer.dataset.qrUrl) {
    new QRCode(qrContainer, {
      text: qrContainer.dataset.qrUrl,
      width: 60,
      height: 60,
      colorDark: '#000000',
      colorLight: '#ffffff'
    });
  }

  return function () { map.remove(); };
}
