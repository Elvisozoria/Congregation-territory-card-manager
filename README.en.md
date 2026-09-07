🌐 *[Español](README.md)*

# Territory Cards — Congregation Manager

A free, open-source web app to manage, assign and print congregation territory cards. It runs in two modes: **offline**, with the data in your browser, or **online**, backed by Firebase and shared with your congregation in real time.

**[Open the app](https://elvisozoria.github.io/Congregation-territory-card-manager/)** — nothing to install, it runs straight from the browser.

![Main view with territories](public/docs/screenshots/main-territories-dark.png)

## Documentation

The [User Guide](https://elvisozoria.github.io/Congregation-territory-card-manager/docs/guia-de-usuario.html) walks through every feature with screenshots. It is written in Spanish.

## Features

**The territory servant's work**

- **What needs attention** — On opening: assignments out too long, territories never worked, and the ones longest without being worked.
- **Assignments** — Assign to anyone, with or without an account, from the list or the territory page, with full history.
- **S-13 record** — The official form, filtered by service year, with a printable view.
- **Approximate house count** — Per territory, to share the load evenly, with sorting by that number.

**Territories**

- **Territory management** — Create, edit, and delete territories with polygon boundaries drawn on a Leaflet map.
- **Tags** — Several per territory, to filter and group by area, time of day, how you cover it, or type.
- **Congregation boundary** — Upload the branch's KML and it is drawn over the maps as a guide while tracing.
- **Landmark management** — Click the map to add colored landmark markers to each territory.
- **Blocks** — Numbered labels for street blocks inside a territory.

**Cards**

- **Territory cards** — Printable card view with non-interactive map, polygon mask, landmark labels, and optionally a QR code and the house count.
- **Print by area** — Ordered by territory number, and only the filtered group when a tag is selected.
- **PNG download** — Download any card as a 2x resolution PNG.
- **Public links** — Share a territory with someone who has no account.

**Account and congregation**

- **Roles** — Administrator, conductor and publisher.
- **Several congregations** — Keep more than one with the same account and switch without signing out.
- **KML/KMZ import** — Import territory polygons from Google Earth files, with their descriptions kept as notes.
- **Dark/Light mode** — Theme toggle with localStorage persistence.
- **Bilingual** — Spanish and English UI.
- **Cards/Table view** — Toggle between card grid and table list for territories.

## Changelog

See the [CHANGELOG](CHANGELOG.md).

## Maps

Basemaps come from [CARTO](https://carto.com/basemaps/), which has required a free API key since August 2026. If you deploy your own copy, request one at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/) and pass it as `VITE_CARTO_KEY` at build time:

```
VITE_CARTO_KEY=your-key npm run build
```

Without a key the app still works: it falls back to Esri's basemaps, which need no registration. Only the map style changes.

## How to Use

### Option 1: use it online (recommended)

Open **[elvisozoria.github.io/Congregation-territory-card-manager](https://elvisozoria.github.io/Congregation-territory-card-manager/)**. Pick offline mode, where the data stays in your browser, or sign in with Google to share it with your congregation.

### Option 2: run your own copy

1. Download or clone this repository
2. Run `npm install && npm run build`
3. Serve the `dist/` folder, or open `dist/index.html`

## Saving Your Data

- Click **Save JSON** to download your territories as a file
- Click **Load JSON** to restore from a saved file
- **Tip:** Save your JSON file in Google Drive or Dropbox for automatic backup

## Importing from Google Earth

1. Export your territories as KML or KMZ from Google Earth
2. Click **Import KML** and select the file
3. Territories will be added automatically

## Tech Stack

- Vanilla JavaScript with Vite
- Leaflet.js + Leaflet.draw (maps and polygon drawing)
- Firebase Auth + Firestore (online mode)
- html-to-image (PNG export)
- qrcode (QR code generation)
- JSZip (KMZ extraction)

## Contributing

Issues and pull requests are welcome. Fork it and adapt it to your congregation if that is easier.

## License

MIT
