// Alfabeto sin caracteres ambiguos (sin I, L, O, 0, 1, U).
// 32 chars → cada char = 5 bits.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generatePublicId() {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += ALPHABET[buf[i] % ALPHABET.length];
  }
  return id.slice(0, 4) + '-' + id.slice(4);
}

// Normaliza un publicId quitando espacios y separadores, lo vuelve a formatear.
export function normalizePublicId(raw) {
  if (!raw) return '';
  const clean = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 8) return clean;
  return clean.slice(0, 4) + '-' + clean.slice(4);
}

// Construye la URL pública absoluta para un territorio.
export function buildPublicTerritoryUrl(congPublicId, terPublicId) {
  if (!congPublicId || !terPublicId) return '';
  const base = window.location.origin + window.location.pathname;
  return base + '#/p/' + congPublicId + '/' + terPublicId;
}
