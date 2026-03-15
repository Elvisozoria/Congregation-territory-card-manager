import { Controller } from "@hotwired/stimulus"

const TERRITORY_COLORS = ['#1E40AF', '#B91C1C', '#047857', '#7C3AED', '#B45309', '#BE185D']

export default class extends Controller {
  static values = {
    territories: { type: Array, default: [] },
    singleTerritory: { type: Object, default: {} },
  }

  connect() {
    this.initMap()
  }

  disconnect() {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }

  initMap() {
    const map = L.map(this.element, {
      center: [19.500, -70.707],
      zoom: 15
    })

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map)

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri' }
    )

    const hybrid = L.layerGroup([
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri' }
      ),
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { opacity: 0.4 })
    ])

    L.control.layers({ 'OpenStreetMap': osm, 'Satellite': satellite, 'Hybrid': hybrid }).addTo(map)

    window._territoryMap = map
    this.map = map

    const hasSingle = this.hasSingleTerritoryValue && Object.keys(this.singleTerritoryValue).length > 0
    const hasMany = this.hasTerritoriesValue && this.territoriesValue.length > 0

    if (hasSingle) {
      this.renderSingleTerritory(map, this.singleTerritoryValue)
    } else if (hasMany) {
      this.renderAllTerritories(map, this.territoriesValue)
    }
  }

  // Index mode: all territories as colored polygons with labels
  renderAllTerritories(map, territories) {
    const bounds = []

    territories.forEach((territory, index) => {
      if (!territory.polygon || territory.polygon.length < 3) return

      const color = TERRITORY_COLORS[index % TERRITORY_COLORS.length]
      // Polygon data is [lng, lat]; Leaflet wants [lat, lng]
      const coords = territory.polygon.map(c => [c[1], c[0]])

      const polygon = L.polygon(coords, {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.2
      }).addTo(map)

      // Permanent label centered inside polygon
      const center = polygon.getBounds().getCenter()
      const labelIcon = L.divIcon({
        className: '',
        html: `<span style="background:rgba(255,255,255,0.8);padding:2px 5px;font-size:11px;font-weight:bold;border-radius:3px;white-space:nowrap;">${territory.number} - ${territory.name}</span>`,
        iconSize: null,
        iconAnchor: null
      })
      L.marker(center, { icon: labelIcon, interactive: false, keyboard: false }).addTo(map)

      // Click navigates to show page
      if (territory.url) {
        polygon.on('click', () => { window.location.href = territory.url })
        polygon.on('mouseover', function () { this.setStyle({ fillOpacity: 0.4 }) })
        polygon.on('mouseout', function () { this.setStyle({ fillOpacity: 0.2 }) })
      }

      coords.forEach(c => bounds.push(c))
    })

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds))
    }
  }

  // Show mode: single blue polygon + colored landmark markers
  renderSingleTerritory(map, territory) {
    if (!territory.polygon || territory.polygon.length < 3) return

    const coords = territory.polygon.map(c => [c[1], c[0]])

    L.polygon(coords, {
      color: '#1E40AF',
      weight: 3,
      fillColor: '#1E40AF',
      fillOpacity: 0.15
    }).addTo(map)

    map.fitBounds(L.latLngBounds(coords))

    const landmarks = territory.landmarks || []
    landmarks.forEach(landmark => {
      const marker = L.circleMarker([landmark.lat, landmark.lng], {
        radius: 8,
        fillColor: landmark.color || '#3B82F6',
        color: '#1F2937',
        weight: 2,
        fillOpacity: 1
      }).addTo(map)

      marker.bindTooltip(landmark.name, {
        permanent: true,
        direction: 'right',
        offset: [10, 0],
        className: 'landmark-tooltip'
      })
    })
  }
}
