// map.js — Overview and single territory map rendering

window.App = window.App || {};
window.App.Components = window.App.Components || {};

(function () {
  var TERRITORY_COLORS = ['#1E40AF', '#B91C1C', '#047857', '#7C3AED', '#B45309', '#BE185D'];

  // Render all territories on index map
  // Returns cleanup function
  function renderOverviewMap(container, territories) {
    var defaultCenter = App.Store.getDefaultCenter ? App.Store.getDefaultCenter() : [0, 0];
    var defaultZoom = (defaultCenter[0] === 0 && defaultCenter[1] === 0) ? 2 : 15;
    var map = L.map(container, { center: defaultCenter, zoom: defaultZoom });

    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);

    var satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri' }
    );

    var hybrid = L.layerGroup([
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri' }
      ),
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { opacity: 0.4 })
    ]);

    L.control.layers({ 'OpenStreetMap': osm, 'Satellite': satellite, 'Hybrid': hybrid }).addTo(map);

    var bounds = [];

    territories.forEach(function (territory, index) {
      if (!territory.polygon || territory.polygon.length < 3) return;

      var color = TERRITORY_COLORS[index % TERRITORY_COLORS.length];
      var coords = territory.polygon.map(function (c) { return [c[1], c[0]]; });

      var polygon = L.polygon(coords, {
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.2
      }).addTo(map);

      var center = polygon.getBounds().getCenter();
      var labelIcon = L.divIcon({
        className: '',
        html: '<span style="background:rgba(255,255,255,0.8);padding:2px 5px;font-size:11px;font-weight:bold;border-radius:3px;white-space:nowrap;">' + territory.number + ' - ' + territory.name + '</span>',
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

  // Render single territory with landmarks
  // onMapClick(latlng) is called when user clicks the map
  // onMapReady(map) is called with the Leaflet map instance
  // Returns cleanup function
  function renderSingleMap(container, territory, onMapClick, onMapReady) {
    var defaultCenter = App.Store.getDefaultCenter ? App.Store.getDefaultCenter() : [0, 0];
    var defaultZoom = (defaultCenter[0] === 0 && defaultCenter[1] === 0) ? 2 : 15;
    var map = L.map(container, { center: defaultCenter, zoom: defaultZoom });

    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);

    var satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri' }
    );

    var hybrid = L.layerGroup([
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri' }
      ),
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { opacity: 0.4 })
    ]);

    L.control.layers({ 'OpenStreetMap': osm, 'Satellite': satellite, 'Hybrid': hybrid }).addTo(map);

    if (territory.polygon && territory.polygon.length >= 3) {
      var coords = territory.polygon.map(function (c) { return [c[1], c[0]]; });

      L.polygon(coords, {
        color: '#1E40AF',
        weight: 3,
        fillColor: '#1E40AF',
        fillOpacity: 0.15
      }).addTo(map);

      map.fitBounds(L.latLngBounds(coords));
    }

    var landmarks = territory.landmarks || [];
    landmarks.forEach(function (landmark) {
      var marker = L.circleMarker([landmark.lat, landmark.lng], {
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

  window.App.Components.Map = {
    renderOverviewMap: renderOverviewMap,
    renderSingleMap: renderSingleMap
  };
})();
