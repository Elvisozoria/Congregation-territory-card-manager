window.App = window.App || {};
window.App.I18n = window.App.I18n || {};

(function () {
  var STORAGE_KEY = 'territory-cards-lang';
  var DEFAULT_LANG = 'es';
  var currentLang = DEFAULT_LANG;

  // Restore from localStorage
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved && window.App.I18n.languages[saved]) {
      currentLang = saved;
    }
  } catch (e) {}

  // t('show.landmarks') → resolves nested key from current language
  // t('confirm.deleteTerritory', { number: '1', name: 'La Joya' }) → replaces {number} and {name}
  function t(key, params) {
    var parts = key.split('.');
    var value = window.App.I18n.languages[currentLang];
    for (var i = 0; i < parts.length; i++) {
      if (value === undefined) break;
      value = value[parts[i]];
    }
    // Fallback to default language
    if (value === undefined) {
      value = window.App.I18n.languages[DEFAULT_LANG];
      for (var j = 0; j < parts.length; j++) {
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

  window.App.I18n.t = t;
  window.App.I18n.getLang = function () { return currentLang; };
  window.App.I18n.setLang = function (lang) {
    if (window.App.I18n.languages[lang]) {
      currentLang = lang;
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    }
  };
  window.App.I18n.getAvailableLanguages = function () {
    return Object.keys(window.App.I18n.languages);
  };
})();
