import { Controller } from "@hotwired/stimulus"

// Inverted polygon mask: darkens the world outside the territory boundary.
// Technique: outer ring covers the whole world; territory polygon is the hole.
const WORLD_BOUNDS = [[90, -180], [90, 180], [-90, 180], [-90, -180]]

export default class extends Controller {
  static values = {
    territory: { type: Object, default: {} }
  }

  connect() {
    this.initMap()
    this.generateQR()
  }

  disconnect() {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }

  initMap() {
    const map = L.map(this.element, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
      boxZoom: false
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

    this.map = map

    const territory = this.territoryValue

    if (territory.polygon && territory.polygon.length >= 3) {
      // Polygon stored as [lng, lat]; Leaflet wants [lat, lng]
      const coords = territory.polygon.map(c => [c[1], c[0]])

      // Draw the territory polygon outline
      L.polygon(coords, {
        color: '#1E40AF',
        weight: 3,
        fillOpacity: 0
      }).addTo(map)

      // Polygon mask: invert the territory to lighten everything outside
      L.polygon([WORLD_BOUNDS, coords], {
        color: 'none',
        fillColor: 'white',
        fillOpacity: 0.75,
        stroke: false
      }).addTo(map)

      map.fitBounds(L.latLngBounds(coords), { padding: [30, 30] })
    }

    const landmarks = territory.landmarks || []
    landmarks.forEach(landmark => {
      const marker = L.circleMarker([landmark.lat, landmark.lng], {
        radius: 6,
        fillColor: landmark.color || '#3B82F6',
        color: '#1F2937',
        weight: 1.5,
        fillOpacity: 1
      }).addTo(map)

      marker.bindTooltip(landmark.name, {
        permanent: true,
        direction: 'right',
        offset: [8, 0],
        className: 'landmark-tooltip'
      })
    })
  }

  generateQR() {
    const qrContainer = this.element.querySelector('[data-qr-url]')
    if (!qrContainer) return

    const url = qrContainer.dataset.qrUrl
    if (!url || typeof QRCode === 'undefined') return

    new QRCode(qrContainer, {
      text: url,
      width: 60,
      height: 60,
      colorDark: '#000000',
      colorLight: '#ffffff'
    })
  }
}
