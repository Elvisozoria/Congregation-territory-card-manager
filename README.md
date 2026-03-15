# Congregation Territory Card Manager

A Rails 7 application for managing congregation territory cards. Territories are defined by geographic polygons and can contain landmarks. Each territory can be viewed as a printable card with a map and optional QR code.

## Features

- **Territory management** — Create, edit, and delete territories with polygon boundaries drawn on a Leaflet map.
- **Landmark management** — Click the map on the territory show page to add colored landmark markers.
- **Territory cards** — Each territory has a card view (480×288px) showing a non-interactive map with:
  - Polygon mask that darkens the area outside the territory boundary
  - Colored landmark markers with permanent labels
  - Optional QR code (bottom-right corner)
  - Territory number and name label (top-left corner)
- **PNG download** — Download any card as a 2× resolution PNG via `html2canvas`.
- **Print all** — Render all territory cards in print layout for bulk printing.
- **KML/KMZ import** — Rake task to import territory polygons from KML/KMZ files.

## Tech Stack

- Ruby on Rails 7 with Hotwire (Turbo + Stimulus)
- PostgreSQL
- Leaflet.js (maps) + Leaflet.draw (polygon drawing)
- html2canvas (PNG export)
- qrcodejs (QR code generation)
- Importmap (no Node/webpack required)

## Setup

```bash
bundle install
bin/rails db:create db:migrate
bin/rails server
```

## Importing Territories from KML

```bash
bin/rails territories:import_kml[path/to/file.kml]
```

## Key Routes

| Route | Description |
|-------|-------------|
| `GET /territories` | Index with interactive map overview |
| `GET /territories/:id` | Show territory with editable polygon and landmarks |
| `GET /territories/:id/card` | Printable territory card |
| `GET /print` | All territory cards for bulk printing |

## Architecture

### Stimulus Controllers

| Controller | File | Purpose |
|------------|------|---------|
| `map` | `map_controller.js` | Index + show map: renders all territories or single territory with landmarks |
| `card-map` | `card_map_controller.js` | Card view: non-interactive map with polygon mask and QR generation |
| `polygon-draw` | `polygon_draw_controller.js` | Polygon drawing tool on new/edit forms |
| `landmark` | `landmark_controller.js` | Click-to-add landmark on show page |

### Polygon Mask

The card map uses an inverted polygon technique: a world-covering outer ring with the territory polygon as a hole, rendered with semi-transparent dark fill. This focuses attention on the territory boundary.

### Data Format

Territory polygons are stored as JSON arrays of `[longitude, latitude]` coordinate pairs (GeoJSON order). Leaflet expects `[lat, lng]` so all controllers reverse the coordinate order when rendering.
