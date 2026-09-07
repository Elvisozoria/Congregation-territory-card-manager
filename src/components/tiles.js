import L from 'leaflet';

// Capas base de los mapas, en un solo sitio.
//
// El mapa original era el Voyager de CARTO. En agosto de 2026 CARTO empezó a
// exigir una llave y desde entonces devuelve una imagen con "API KEY REQUIRED"
// escrita encima, que salía en todos los mapas y en las tarjetas impresas. La
// llave es gratuita hasta cinco millones de peticiones al mes y admite
// expresamente el uso no comercial, así que se vuelve a Voyager en cuanto hay
// una configurada en VITE_CARTO_KEY.
//
// Sin llave la app sigue funcionando con Esri, que sirve sin registro. Nunca se
// queda sin mapa: eso es lo que hace seguro desplegar sin la llave puesta.
//
// ponytail: OpenStreetMap directo se descartó a propósito. Sus servidores son
// de voluntarios y su política bloquea a las aplicaciones que tiran de ellos;
// al probarlo devolvía "Access blocked" en vez del mapa.

// La llave viaja en el bundle, como cualquier clave de mapa en una app de
// navegador. CARTO lo contempla: por eso exige mantener visible la atribución
// y avisa antes de cortar si alguien se pasa del límite.
const CARTO_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CARTO_KEY) || '';

const CARTO_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';
const ESRI_ATTR = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';

// El parámetro es `key`. Con `api_key` la petición responde 200 y devuelve el
// mapa, pero con la marca de agua encima: no falla, sólo ignora la llave, así
// que desde fuera parece que la llave no sirve.
function carto(style) {
  return 'https://{s}.basemaps.cartocdn.com/rastertiles/' + style +
    '/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(CARTO_KEY);
}

// Respaldo sin llave. El lienzo gris claro de Esri es casi blanco y sin relieve
// sombreado, que es lo más parecido al Voyager que se perdió.
const ESRI_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_CANVAS_REF = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const ESRI_STREET = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export function hasCartoKey() {
  return CARTO_KEY.length > 0;
}

// Capa por defecto y la única de las tarjetas impresas.
export function streetLayer() {
  if (hasCartoKey()) {
    return L.tileLayer(carto('voyager'), { attribution: CARTO_ATTR, maxZoom: 20 });
  }
  // El lienzo de Esri trae los nombres en una capa aparte, así que van juntos.
  return L.layerGroup([
    L.tileLayer(ESRI_CANVAS, { attribution: ESRI_ATTR, maxZoom: 19 }),
    L.tileLayer(ESRI_CANVAS_REF, { maxZoom: 19 })
  ]);
}

// Más carga de detalle: destaca las carreteras, que en el campo a veces es
// justo lo que hace falta para ubicarse. Se ofrece como capa, no se impone.
export function roadsLayer() {
  if (hasCartoKey()) {
    return L.tileLayer(carto('voyager_labels_under'), { attribution: CARTO_ATTR, maxZoom: 20 });
  }
  return L.tileLayer(ESRI_STREET, { attribution: ESRI_ATTR, maxZoom: 19 });
}

export function satelliteLayer() {
  return L.tileLayer(ESRI_IMAGERY, { attribution: ESRI_ATTR, maxZoom: 19 });
}

// Satélite con los nombres de calles y lugares encima: es la vista más útil
// para reconocer un territorio rural, donde no hay direcciones.
export function hybridLayer() {
  return L.layerGroup([
    L.tileLayer(ESRI_IMAGERY, { attribution: ESRI_ATTR, maxZoom: 19 }),
    hasCartoKey()
      ? L.tileLayer(carto('voyager_only_labels'), { maxZoom: 20, opacity: 0.9 })
      : L.tileLayer(ESRI_LABELS, { maxZoom: 19 })
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
