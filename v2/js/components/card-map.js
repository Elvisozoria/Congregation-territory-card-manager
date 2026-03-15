// card-map.js — Read-only map for printable cards with inverted polygon mask + QR

window.App = window.App || {};
window.App.Components = window.App.Components || {};

(function () {
  var WORLD_BOUNDS = [[90, -180], [90, 180], [-90, 180], [-90, -180]];

  // Render a card map inside a territory-card container
  // Returns cleanup function
  function renderCardMap(cardElement, territory) {
    var mapDiv = cardElement.querySelector('.card-map') || cardElement;

    var map = L.map(mapDiv, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      boxZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    if (territory.polygon && territory.polygon.length >= 3) {
      var coords = territory.polygon.map(function (c) { return [c[1], c[0]]; });

      // Territory outline
      L.polygon(coords, {
        color: '#1E40AF',
        weight: 3,
        fillOpacity: 0
      }).addTo(map);

      // Inverted mask — darken everything outside territory
      L.polygon([WORLD_BOUNDS, coords], {
        color: 'none',
        fillColor: 'white',
        fillOpacity: 0.75,
        stroke: false
      }).addTo(map);

      map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });
    }

    var landmarks = territory.landmarks || [];
    landmarks.forEach(function (landmark) {
      var marker = L.circleMarker([landmark.lat, landmark.lng], {
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
    var qrContainer = cardElement.querySelector('[data-qr-url]');
    if (qrContainer && qrContainer.dataset.qrUrl && typeof QRCode !== 'undefined') {
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

  window.App.Components.CardMap = {
    renderCardMap: renderCardMap
  };
})();
