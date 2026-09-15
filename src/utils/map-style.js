// Apariencia del mapa de las tarjetas, por congregación.
//
// Lo que se ve bien en ciudad no se ve bien en el campo: sobre satélite el
// contorno azul se pierde, y en un paraje con tres caminos el mapa de calles
// no enseña nada. Cada congregación elige lo suyo desde Configuración; los
// valores por defecto son exactamente el aspecto que tenía la app antes, así
// que quien no toque nada no nota el cambio.

export const BASES = ['clean', 'roads', 'terrain', 'satellite', 'hybrid'];

// Cinco colores que funcionan sobre todos los mapas base, en vez de un
// selector libre: amarillo y blanco para satélite, el resto para calles.
export const OUTLINE_COLORS = ['#1E40AF', '#DC2626', '#F59E0B', '#FFFFFF', '#111827'];

export const OUTLINE_WEIGHTS = [2, 3, 5];

// Tamaño en píxeles de las etiquetas de puntos de referencia y manzanas
// dentro de la tarjeta. 9 es el de siempre; impreso queda pequeño.
export const LABEL_SIZES = [9, 11, 13, 15];

export const DEFAULT_STYLE = Object.freeze({
  base: 'clean',
  veil: 60,
  outlineColor: '#1E40AF',
  outlineWeight: 3,
  fill: 0,
  labelSize: 9
});

function pick(value, allowed, fallback) {
  return allowed.indexOf(value) >= 0 ? value : fallback;
}

function percent(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

// Lo guardado puede venir incompleto (ajustes añadidos después) o con basura
// (a mano en Firestore). Siempre devuelve un estilo completo y válido.
export function normalizeStyle(raw) {
  const s = raw || {};
  return {
    base: pick(s.base, BASES, DEFAULT_STYLE.base),
    veil: percent(s.veil, DEFAULT_STYLE.veil),
    outlineColor: pick(s.outlineColor, OUTLINE_COLORS, DEFAULT_STYLE.outlineColor),
    outlineWeight: pick(Number(s.outlineWeight), OUTLINE_WEIGHTS, DEFAULT_STYLE.outlineWeight),
    fill: Math.min(30, percent(s.fill, DEFAULT_STYLE.fill)),
    labelSize: pick(Number(s.labelSize), LABEL_SIZES, DEFAULT_STYLE.labelSize)
  };
}

// Enlaces de navegación a un punto exacto. Son URLs corrientes, sin API ni
// llave. `dir` abre la ruta hasta el punto; `search` sólo deja el pin.
export function googleMapsDirections(lat, lng) {
  return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
}

export function googleMapsPin(lat, lng) {
  return 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;
}

export function wazeDirections(lat, lng) {
  return 'https://waze.com/ul?ll=' + lat + ',' + lng + '&navigate=yes';
}

// El punto al que llevar a quien abre el territorio desde el QR: la entrada
// si alguien la marcó, y si no el centro del polígono.
export function startPoint(territory, center) {
  const entry = (territory.landmarks || []).find(function (lm) { return lm.isStart; });
  if (entry) return { lat: entry.lat, lng: entry.lng, isStart: true };
  if (center) return { lat: center.lat, lng: center.lng, isStart: false };
  return null;
}
