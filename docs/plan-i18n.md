# i18n Implementation Plan — Territory Cards v2

## Context

- Pure HTML+JS SPA, no build tools, no frameworks
- Runs from `file://` protocol — `fetch()` is blocked, so language data must be in `.js` files (not JSON)
- All JS uses `window.App` global namespace pattern with IIFEs (no ES modules)
- Scripts loaded as `<script>` tags in `index.html` in dependency order
- User preference stored in `localStorage` (key: `territory-cards-lang`)
- Spanish is the default language
- Current branch: `feat/v2-html-and-js-only-version`
- Git hooks: conventional commits, lowercase after prefix, no Co-Authored-By, max 72 chars

## Architecture

```
js/i18n/i18n.js   — Core module: t(), setLang(), getLang(), getAvailableLanguages()
js/i18n/es.js     — Spanish strings (default)
js/i18n/en.js     — English strings
```

Script load order in index.html (i18n files must load BEFORE all other app JS):
```html
<script src="js/i18n/es.js"></script>
<script src="js/i18n/en.js"></script>
<script src="js/i18n/i18n.js"></script>
<script src="js/utils/helpers.js"></script>
<!-- ... rest of scripts ... -->
```

## File: js/i18n/es.js

```js
window.App = window.App || {};
window.App.I18n = window.App.I18n || {};
window.App.I18n.languages = window.App.I18n.languages || {};

window.App.I18n.languages.es = {
  _label: 'ES',
  _name: 'Español',

  // Navbar
  nav: {
    brand: 'Tarjetas de Territorio',
    printAll: 'Imprimir',
    loadJson: 'Cargar JSON',
    saveJson: 'Guardar JSON',
    importKml: 'Importar KML',
    reset: 'Reiniciar'
  },

  // Welcome screen
  welcome: {
    title: 'Aún no tienes territorios',
    subtitle: 'Comienza creando tu primer territorio o cargando datos existentes.',
    createTerritory: 'Crear Territorio',
    loadDemo: 'Cargar Demo',
    loadJson: 'Cargar archivo JSON',
    importKml: 'Importar KML/KMZ'
  },

  // Index view
  index: {
    title: 'Territorios',
    newTerritory: 'Nuevo Territorio',
    colNumber: '#',
    colName: 'Nombre',
    colGroup: 'Grupo',
    colLandmarks: 'Puntos',
    btnCard: 'Tarjeta',
    btnEdit: 'Editar',
    btnDelete: 'Eliminar'
  },

  // Show view
  show: {
    btnCard: 'Tarjeta',
    btnEdit: 'Editar',
    btnBack: 'Volver',
    clickToAdd: 'Haz clic en el mapa para agregar un punto de referencia',
    landmarks: 'Puntos de Referencia',
    noLandmarks: 'Sin puntos de referencia aún. Haz clic en el mapa para agregar uno.',
    deleteLandmark: 'Eliminar',
    deleteTerritory: 'Eliminar este territorio',
    promptLandmarkName: 'Nombre del punto de referencia:',
    confirmDeleteLandmark: '¿Eliminar este punto de referencia?',
    confirmDeleteTerritory: '¿Eliminar el territorio "{name}"? Esta acción no se puede deshacer.'
  },

  // Form view
  form: {
    titleNew: 'Nuevo Territorio',
    titleEdit: 'Editar Territorio',
    cancel: 'Cancelar',
    fieldNumber: 'Número',
    fieldName: 'Nombre',
    fieldGroup: 'Grupo',
    fieldQr: 'Enlace QR (opcional)',
    drawInstruction: 'Haz clic en el <strong>ícono del pentágono</strong> en el mapa, luego haz clic en puntos para dibujar el límite del territorio. Haz clic en el primer punto de nuevo para cerrar la forma.',
    save: 'Guardar Territorio',
    deleteTerritory: 'Eliminar este territorio',
    confirmDelete: '¿Eliminar el territorio "{name}"? Esta acción no se puede deshacer.',
    errorNumber: 'El número es requerido',
    errorName: 'El nombre es requerido',
    errorQrFormat: 'El enlace QR debe comenzar con http:// o https://',
    errorDuplicate: 'El número de territorio "{number}" ya existe'
  },

  // Card view
  card: {
    downloadPng: 'Descargar PNG',
    print: 'Imprimir',
    back: 'Volver'
  },

  // Print view
  print: {
    title: 'Todas las Tarjetas ({count})',
    printAll: 'Imprimir Todo',
    downloadAll: 'Descargar PNGs',
    back: 'Volver'
  },

  // Confirmations & alerts
  confirm: {
    loadReplace: 'Cargar un archivo reemplazará todos los datos actuales. ¿Continuar?',
    reset: 'Esto eliminará todos los datos de territorio almacenados en este navegador. Tus archivos JSON exportados no se verán afectados. ¿Continuar?',
    unsavedChanges: 'Tienes cambios sin guardar. ¿Salir de esta página?',
    deleteTerritory: '¿Eliminar el territorio "{number} - {name}"?'
  },

  // Alerts
  alert: {
    unsavedForm: 'Tienes cambios sin guardar en el formulario. Guarda el territorio primero, luego exporta el JSON.',
    kmlSuccess: '¡KML importado exitosamente!',
    errorLoadJson: 'Error al cargar JSON: ',
    errorImportKml: 'Error al importar KML: ',
    notFound: 'Territorio no encontrado.',
    renderError: 'Algo salió mal al mostrar esta página.'
  }
};
```

## File: js/i18n/en.js

Same structure, English values. Key differences:
- `nav.brand`: 'Territory Cards'
- `welcome.title`: 'No territories yet'
- `index.title`: 'Territories'
- `show.landmarks`: 'Landmarks'
- `form.drawInstruction`: 'Click the <strong>pentagon icon</strong>...'
- etc.

## File: js/i18n/i18n.js

```js
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
```

## Changes to index.html

1. Add the 3 i18n scripts BEFORE helpers.js
2. Add language switcher in navbar (after Reset button)
3. Update navbar button texts to use IDs (so app.js can set their text via t())

The navbar buttons have hardcoded text. Since we can't use t() in static HTML (scripts haven't loaded yet), we need to set navbar text dynamically in app.js on init.

Change navbar to use IDs on text elements:
```html
<a href="#/" class="navbar-brand" id="nav-brand">Territory Cards</a>
<div class="navbar-actions">
  <a href="#/print" class="btn btn-secondary btn-sm" id="nav-print">Print All</a>
  <button id="btn-load" class="btn btn-secondary btn-sm">Load JSON</button>
  <button id="btn-save" class="btn btn-secondary btn-sm">Save JSON</button>
  <button id="btn-import-kml" class="btn btn-secondary btn-sm">Import KML</button>
  <button id="btn-reset" class="btn-navbar-text">Reset</button>
  <div id="lang-switcher" class="lang-switcher"></div>
  <!-- file inputs stay the same -->
</div>
```

## Changes to app.js

Add at the top of `DOMContentLoaded`:
1. Build the language switcher dynamically from `App.I18n.getAvailableLanguages()`
2. Call a `updateNavbarText()` function that sets all navbar button texts using `t()`
3. On language switch: `App.I18n.setLang(lang)` → re-render everything via `App.Router.refresh()` + `updateNavbarText()`

```js
function updateNavbarText() {
  document.getElementById('nav-brand').textContent = t('nav.brand');
  document.getElementById('nav-print').textContent = t('nav.printAll');
  document.getElementById('btn-load').textContent = t('nav.loadJson');
  document.getElementById('btn-save').textContent = t('nav.saveJson');
  document.getElementById('btn-import-kml').textContent = t('nav.importKml');
  document.getElementById('btn-reset').textContent = t('nav.reset');
}
```

## Changes to each view (replace ALL hardcoded strings)

### views/index.js
- `'No territories yet'` → `t('welcome.title')`
- `'Territories'` → `t('index.title')`
- `'New Territory'` → `t('index.newTerritory')`
- Column headers: `t('index.colNumber')`, `t('index.colName')`, etc.
- Button texts: `t('index.btnCard')`, `t('index.btnEdit')`, `t('index.btnDelete')`
- `'Create Territory'` → `t('welcome.createTerritory')`
- `'Load Demo'` → `t('welcome.loadDemo')`
- etc.

### views/show.js
- `'Card'` → `t('show.btnCard')`
- `'Edit'` → `t('show.btnEdit')`
- `'Back'` → `t('show.btnBack')`
- `'Click on the map to add a landmark'` → `t('show.clickToAdd')`
- `'Landmarks'` → `t('show.landmarks')`
- `'No landmarks yet...'` → `t('show.noLandmarks')`
- `prompt('Landmark name:')` → `prompt(t('show.promptLandmarkName'))`
- `confirm('Delete this landmark?')` → `confirm(t('show.confirmDeleteLandmark'))`
- `'Delete this territory'` → `t('show.deleteTerritory')`
- Delete confirm → `t('show.confirmDeleteTerritory', { name: territory.number + ' - ' + territory.name })`

### views/form.js
- `'New Territory'` / `'Edit Territory'` → `t('form.titleNew')` / `t('form.titleEdit')`
- `'Cancel'` → `t('form.cancel')`
- Labels: `t('form.fieldNumber')`, `t('form.fieldName')`, etc.
- Instruction text: `t('form.drawInstruction')` (contains HTML with <strong>)
- `'Save Territory'` → `t('form.save')`
- `'Delete this territory'` → `t('form.deleteTerritory')`
- Error messages: `t('form.errorNumber')`, etc.
- `t('form.errorDuplicate', { number: number })`

### views/card.js
- `'Download PNG'` → `t('card.downloadPng')`
- `'Print'` → `t('card.print')`
- `'Back'` → `t('card.back')`

### views/print.js
- `'All Territory Cards (3)'` → `t('print.title', { count: territories.length })`
- `'Print All'` → `t('print.printAll')`
- `'Download All PNGs'` → `t('print.downloadAll')`
- `'Back'` → `t('print.back')`

### router.js
- `'You have unsaved changes...'` → `t('confirm.unsavedChanges')`
- `'Something went wrong...'` → `t('alert.renderError')`
- `'Back to Home'` → `t('show.btnBack')` (or a generic 'back' key)

### app.js
- `confirm('Loading a file will replace...')` → `confirm(t('confirm.loadReplace'))`
- `confirm('This will clear all territory data...')` → `confirm(t('confirm.reset'))`
- `alert('You have unsaved changes...')` → `alert(t('alert.unsavedForm'))`
- `alert('KML imported successfully!')` → `alert(t('alert.kmlSuccess'))`
- `'Error loading JSON: '` → `t('alert.errorLoadJson')`
- `'Error importing KML: '` → `t('alert.errorImportKml')`

## CSS for language switcher

```css
.lang-switcher { display: flex; gap: 2px; margin-left: 0.5rem; }
.lang-btn { background: none; border: 1px solid #4B5563; color: #9CA3AF; font-size: 0.6875rem;
  padding: 0.125rem 0.375rem; cursor: pointer; font-weight: 600; transition: all 0.2s; }
.lang-btn:first-child { border-radius: 4px 0 0 4px; }
.lang-btn:last-child { border-radius: 0 4px 4px 0; }
.lang-btn.active { background: #4B5563; color: white; }
.lang-btn:hover:not(.active) { color: white; }
```

## Task sequence

1. Create `js/i18n/es.js` with all Spanish strings
2. Create `js/i18n/en.js` with all English strings
3. Create `js/i18n/i18n.js` with core module
4. Update `index.html` — add script tags + lang switcher container + IDs on navbar elements
5. Update `css/styles.css` — add lang switcher styles
6. Update `app.js` — navbar text updates + lang switcher logic
7. Update `views/index.js` — replace all hardcoded strings
8. Update `views/show.js` — replace all hardcoded strings
9. Update `views/form.js` — replace all hardcoded strings
10. Update `views/card.js` — replace all hardcoded strings
11. Update `views/print.js` — replace all hardcoded strings
12. Update `router.js` — replace hardcoded strings
13. Commit: `feat: add i18n support with spanish and english`
14. Test: reload app, switch languages, verify all strings change, verify preference persists across page loads

## Important notes
- `t()` returns plain text by default. For the form instruction which contains `<strong>`, use `innerHTML` (it's safe since the string comes from our own language file, not user input)
- The `t()` function has fallback: current lang → default lang (es) → raw key
- `{param}` placeholder syntax for dynamic values in strings
- Language preference is saved in localStorage under `territory-cards-lang`
- Territory data (names, landmarks, etc.) is NOT translated — only UI chrome
- The navbar brand text changes with language (Territory Cards ↔ Tarjetas de Territorio)
