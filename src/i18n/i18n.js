import es from './es.js';
import en from './en.js';

const STORAGE_KEY = 'territory-cards-lang';
const DEFAULT_LANG = 'es';

const languages = { es, en };
let currentLang = DEFAULT_LANG;

// Restore from localStorage
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && languages[saved]) {
    currentLang = saved;
  }
} catch (e) { /* ignore */ }

export function t(key, params) {
  const parts = key.split('.');
  let value = languages[currentLang];
  for (let i = 0; i < parts.length; i++) {
    if (value === undefined) break;
    value = value[parts[i]];
  }
  // Fallback to default language
  if (value === undefined) {
    value = languages[DEFAULT_LANG];
    for (let j = 0; j < parts.length; j++) {
      if (value === undefined) break;
      value = value[parts[j]];
    }
  }
  // Final fallback: return the key itself
  if (value === undefined) return key;
  // Replace {param} placeholders
  if (params) {
    Object.keys(params).forEach(function (k) {
      value = value.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
    });
  }
  return value;
}

export function getLang() { return currentLang; }

export function setLang(lang) {
  if (languages[lang]) {
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }
}

export function getAvailableLanguages() {
  return Object.keys(languages);
}

export { languages };
