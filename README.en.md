🌐 *[Español](README.md)*

# Territory Cards — Congregation Manager

A lightweight, zero-installation web app for managing congregation territory cards. No server, no database — just open `index.html` in your browser.

![Main view with territories](docs/screenshots/02-index.png)

## Features

- **Territory management** — Create, edit, and delete territories with polygon boundaries drawn on a Leaflet map.
- **Landmark management** — Click the map to add colored landmark markers to each territory.
- **Territory cards** — Printable card view with non-interactive map, polygon mask, landmark labels, and optional QR code.
- **PNG download** — Download any card as a 2x resolution PNG.
- **Print all** — Render all territory cards for bulk printing.
- **KML/KMZ import** — Import territory polygons from Google Earth files.
- **Dark/Light mode** — Theme toggle with localStorage persistence.
- **Bilingual** — Spanish and English UI.
- **Cards/Table view** — Toggle between card grid and table list for territories.

## How to Use

1. Download or clone this repository
2. Open `index.html` in your browser
3. Done!

No server, no Node.js, no build step. Works offline and from `file://`.

![Welcome screen](docs/screenshots/01-welcome.png)

## Views

### Territory detail
Shows the map with the polygon and landmarks. Click the map to add new landmarks.

![Detail view](docs/screenshots/03-show.png)

### Printable card
Card ready to print or download as PNG.

![Card view](docs/screenshots/04-card.png)

### Edit form
Edit the territory name, number, group, and draw the polygon.

![Edit form](docs/screenshots/05-edit.png)

### Light mode
The app supports both dark and light mode.

![Light mode](docs/screenshots/07-light-mode.png)

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
