# Congregation Territory Card Manager

A lightweight, zero-installation web app for managing congregation territory cards. No server, no database — just open `index.html` in your browser.

## Features

- **Territory management** — Create, edit, and delete territories with polygon boundaries drawn on a Leaflet map.
- **Landmark management** — Click the map to add colored landmark markers to each territory.
- **Territory cards** — Printable card view with non-interactive map, polygon mask, landmark labels, and optional QR code.
- **PNG download** — Download any card as a 2x resolution PNG.
- **Print all** — Render all territory cards for bulk printing.
- **KML/KMZ import** — Import territory polygons from Google Earth files.
- **Dark/Light mode** — Theme toggle with localStorage persistence.
- **Bilingual** — Spanish and English UI with automatic language detection.
- **Cards/Table view** — Toggle between card grid and table list for territories.

## How to Use

1. Download or clone this repository
2. Open `index.html` in your browser
3. Done!

No server, no Node.js, no build step. Works offline and from `file://`.

## Saving Your Data

- Click **Save JSON** to download your territories as a file
- Click **Load JSON** to restore from a saved file
- **Tip:** Save your JSON file in Google Drive or Dropbox for automatic backup

## Importing from Google Earth

1. Export your territories as KML or KMZ from Google Earth
2. Click **Import KML** and select the file
3. Territories will be added automatically

## Tech Stack

- Pure HTML, CSS, and vanilla JavaScript (no frameworks)
- Leaflet.js + Leaflet.draw (maps and polygon drawing)
- html2canvas (PNG export)
- qrcodejs (QR code generation)
- JSZip (KMZ extraction)
- localStorage for data persistence

## Data Format

Territory polygons are stored as JSON arrays of `[longitude, latitude]` coordinate pairs (GeoJSON order). Leaflet expects `[lat, lng]` so the code reverses coordinate order when rendering.
