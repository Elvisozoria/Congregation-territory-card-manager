import L from 'leaflet';

// Capas base de los mapas, en un solo sitio.
//
// CARTO empezó a exigir API key para sus mapas base y desde entonces devuelve
// una imagen con "API KEY REQUIRED" escrito encima. Se veía en todos los mapas
// de la app, incluidas las tarjetas impresas. Esri sirve los suyos sin llave y
// ya se usaba aquí para el satélite, así que pasa a servir también la calle.
//
// ponytail: OpenStreetMap directo se descartó a propósito. Sus servidores son
// de voluntarios y su política bloquea a las aplicaciones que tiran de ellos;
// al probarlo devolvía "Access blocked" en vez del mapa.

const ESRI = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';
const ESRI_STREET = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export function streetLayer() {
  return L.tileLayer(ESRI_STREET, { attribution: ESRI, maxZoom: 19 });
}

export function satelliteLayer() {
  return L.tileLayer(ESRI_IMAGERY, { attribution: ESRI, maxZoom: 19 });
}

// Satélite con los nombres de calles y lugares encima: es la vista más útil
// para reconocer un territorio rural, donde no hay direcciones.
export function hybridLayer() {
  return L.layerGroup([
    L.tileLayer(ESRI_IMAGERY, { attribution: ESRI, maxZoom: 19 }),
    L.tileLayer(ESRI_LABELS, { maxZoom: 19 })
  ]);
}

export function baseLayers() {
  return {
    'Street': streetLayer(),
    'Satellite': satelliteLayer(),
    'Hybrid': hybridLayer()
  };
}
