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
// Lienzo gris claro de Esri: fondo casi blanco, sin relieve sombreado y sin
// el beige del mapa de calles. Es lo mas parecido al mapa limpio de antes, y
// en las tarjetas impresas deja que el contorno del territorio resalte.
const ESRI_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_CANVAS_REF = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const ESRI_STREET = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

// Capa por defecto y la unica de las tarjetas impresas. El lienzo trae los
// nombres aparte, asi que van juntos.
export function streetLayer() {
  return L.layerGroup([
    L.tileLayer(ESRI_CANVAS, { attribution: ESRI, maxZoom: 19 }),
    L.tileLayer(ESRI_CANVAS_REF, { maxZoom: 19 })
  ]);
}

// El mapa de calles de Esri: mas cargado, con relieve y colores, pero destaca
// las carreteras. En el campo eso a veces es justo lo que hace falta, asi que
// se ofrece como capa y no se impone.
export function roadsLayer() {
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

// El orden importa: la primera es la que se enciende al abrir el mapa.
export function baseLayers() {
  return {
    'Clean': streetLayer(),
    'Roads': roadsLayer(),
    'Satellite': satelliteLayer(),
    'Hybrid': hybridLayer()
  };
}
