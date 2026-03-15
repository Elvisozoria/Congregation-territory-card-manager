import { Controller } from "@hotwired/stimulus"

const LANDMARK_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B']

export default class extends Controller {
  static values = {
    createUrl: String,
    landmarkCount: { type: Number, default: 0 }
  }

  connect() {
    this.waitForMap()
  }

  disconnect() {
    clearInterval(this.pollTimer)
    if (this.boundMap) {
      this.boundMap.off('click', this.onMapClick)
    }
  }

  waitForMap() {
    if (window._territoryMap) {
      this.bindToMap(window._territoryMap)
    } else {
      this.pollTimer = setInterval(() => {
        if (window._territoryMap) {
          clearInterval(this.pollTimer)
          this.bindToMap(window._territoryMap)
        }
      }, 100)
    }
  }

  bindToMap(map) {
    this.boundMap = map
    this.onMapClick = (e) => this.handleClick(e)
    map.on('click', this.onMapClick)
  }

  handleClick(e) {
    const name = prompt('Landmark name:')
    if (!name || name.trim() === '') return

    const color = LANDMARK_COLORS[this.landmarkCountValue % LANDMARK_COLORS.length]
    this.submitLandmark(name.trim(), e.latlng.lat, e.latlng.lng, color)
  }

  submitLandmark(name, lat, lng, color) {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = this.createUrlValue

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
    if (csrfToken) {
      this.appendHidden(form, 'authenticity_token', csrfToken)
    }

    this.appendHidden(form, 'landmark[name]', name)
    this.appendHidden(form, 'landmark[lat]', lat)
    this.appendHidden(form, 'landmark[lng]', lng)
    this.appendHidden(form, 'landmark[color]', color)

    document.body.appendChild(form)
    form.submit()
  }

  appendHidden(form, name, value) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
}
