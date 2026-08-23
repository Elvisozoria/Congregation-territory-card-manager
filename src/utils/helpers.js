import { getLang } from '../i18n/i18n.js';

export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Fecha de hoy en ISO, según el reloj local.
 *
 * `new Date().toISOString()` da la fecha UTC: asignando de noche en RD (UTC-4)
 * devolvía la de mañana. Las fechas del historial son días de calendario, no
 * instantes, así que se arman con los componentes locales.
 */
export function todayISO() {
  const d = new Date();
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/**
 * Muestra una fecha ISO como la escribe la gente: 23/08/2026 en español,
 * 08/23/2026 en inglés. Con `short`, el año va de dos dígitos — el S-13 impreso
 * no tiene ancho para más.
 *
 * Se parte el string en vez de usar Date: `new Date('2026-08-23')` es medianoche
 * UTC y en RD se renderizaría como el 22.
 */
export function formatDate(iso, opts) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso);
  const year = opts && opts.short ? m[1].slice(2) : m[1];
  return getLang() === 'en'
    ? m[2] + '/' + m[3] + '/' + year
    : m[3] + '/' + m[2] + '/' + year;
}
