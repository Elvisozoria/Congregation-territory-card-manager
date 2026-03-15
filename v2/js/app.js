// app.js — Entry point: wires store, router, UI buttons, and i18n

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var t = App.I18n.t;

    // Build language switcher (icon + dropdown)
    var langSwitcher = document.getElementById('lang-switcher');
    var languages = App.I18n.getAvailableLanguages();

    var langToggle = document.createElement('button');
    langToggle.className = 'lang-toggle';
    langToggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 0"/><path d="M4 6l8 0"/><path d="M8 6l0-2"/><path d="M6 12c.53-2.27 2.05-4 4-4"/><path d="M13 18l2-5 2 5"/><path d="M13.5 16.5h3"/><path d="M3 21c3-4.5 6-7.5 12-10.5"/></svg>';
    langSwitcher.appendChild(langToggle);

    var langMenu = document.createElement('div');
    langMenu.className = 'lang-menu';

    languages.forEach(function (lang) {
      var item = document.createElement('button');
      item.className = 'lang-menu-item' + (lang === App.I18n.getLang() ? ' active' : '');
      item.textContent = App.I18n.languages[lang]._name;
      item.addEventListener('click', function () {
        App.I18n.setLang(lang);
        langMenu.querySelectorAll('.lang-menu-item').forEach(function (b) { b.classList.remove('active'); });
        item.classList.add('active');
        langMenu.classList.remove('open');
        updateNavbarText();
        App.Router.refresh();
      });
      langMenu.appendChild(item);
    });

    langSwitcher.appendChild(langMenu);

    langToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      langMenu.classList.toggle('open');
    });

    document.addEventListener('click', function () {
      langMenu.classList.remove('open');
    });

    function updateNavbarText() {
      document.getElementById('nav-brand').textContent = t('nav.brand');
      document.getElementById('nav-print').textContent = t('nav.printAll');
      document.getElementById('btn-load').textContent = t('nav.loadJson');
      document.getElementById('btn-save').textContent = t('nav.saveJson');
      document.getElementById('btn-import-kml').textContent = t('nav.importKml');
      document.getElementById('btn-reset').textContent = t('nav.reset');
    }

    updateNavbarText();

    // Initialize router first (before geolocation callback)
    var appContainer = document.getElementById('app');
    App.Router.init(appContainer);

    // Detect user location for map defaults
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        App.Store.setDefaultCenter(pos.coords.latitude, pos.coords.longitude);
        // Re-render current view so the map uses the new center
        App.Router.refresh();
      });
    }

    // Wire file buttons
    var btnLoad = document.getElementById('btn-load');
    var btnSave = document.getElementById('btn-save');
    var btnImportKml = document.getElementById('btn-import-kml');
    var fileInput = document.getElementById('file-input');
    var kmlInput = document.getElementById('kml-input');

    btnLoad.addEventListener('click', function () {
      if (App.Store.getAll().length > 0) {
        if (!confirm(t('confirm.loadReplace'))) return;
      }
      fileInput.click();
    });
    btnSave.addEventListener('click', function () {
      if (App.Views.Form && App.Views.Form.isDirty) {
        alert(t('alert.unsavedForm'));
        return;
      }
      App.Store.saveToFile();
    });
    btnImportKml.addEventListener('click', function () { kmlInput.click(); });

    var btnReset = document.getElementById('btn-reset');
    btnReset.addEventListener('click', function () {
      if (App.Store.getAll().length === 0) return;
      if (confirm(t('confirm.reset'))) {
        App.Store.reset();
        App.Router.refresh();
      }
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) {
        btnLoad.disabled = true;
        App.Store.loadFromFile(fileInput.files[0]).then(function () {
          fileInput.value = '';
          App.Router.refresh();
        }).catch(function (err) {
          alert(t('alert.errorLoadJson') + err.message);
          fileInput.value = '';
        }).then(function () { btnLoad.disabled = false; });
      }
    });

    kmlInput.addEventListener('change', function () {
      if (kmlInput.files.length > 0) {
        btnImportKml.disabled = true;
        App.Store.importKML(kmlInput.files[0]).then(function () {
          kmlInput.value = '';
          App.Router.refresh();
          alert(t('alert.kmlSuccess'));
        }).catch(function (err) {
          alert(t('alert.errorImportKml') + err.message);
          kmlInput.value = '';
        }).then(function () { btnImportKml.disabled = false; });
      }
    });
  });
})();
