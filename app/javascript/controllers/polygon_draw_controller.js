import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    existingPolygon: { type: Array, default: [] }
  }

  static targets = ['polygonField']

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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map)

    this.map = map
    this.drawnItems = new L.FeatureGroup().addTo(map)

    // Load existing polygon when editing
    if (this.existingPolygonValue && this.existingPolygonValue.length >= 3) {
      const coords = this.existingPolygonValue.map(c => [c[1], c[0]])
      const polygon = L.polygon(coords, {
        color: '#1E40AF',
        weight: 2,
        fillColor: '#1E40AF',
        fillOpacity: 0.2
      })
      this.drawnItems.addLayer(polygon)
      map.fitBounds(polygon.getBounds())
      this.serializeToField()
    }

    // Draw control — polygon tool only, no other shapes
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          shapeOptions: {
            color: '#1E40AF',
            weight: 2,
            fillColor: '#1E40AF',
            fillOpacity: 0.2
          },
          allowIntersection: false,
          showArea: false
        },
        marker: false,
        circle: false,
        rectangle: false,
        polyline: false,
        circlemarker: false
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true
      }
    }).addTo(map)

    // Replace any existing polygon and serialize on draw
    map.on(L.Draw.Event.CREATED, (e) => {
      this.drawnItems.clearLayers()
      this.drawnItems.addLayer(e.layer)
      this.serializeToField()
    })

    map.on(L.Draw.Event.EDITED, () => this.serializeToField())
    map.on(L.Draw.Event.DELETED, () => this.serializeToField())
  }

  serializeToField() {
    const layers = this.drawnItems.getLayers()
    if (layers.length === 0) {
      this.polygonFieldTarget.value = '[]'
      return
    }

    const latlngs = layers[0].getLatLngs()[0]
    // Convert Leaflet [lat, lng] back to storage format [lng, lat]
    const coords = latlngs.map(ll => [ll.lng, ll.lat])
    this.polygonFieldTarget.value = JSON.stringify(coords)
  }
}
