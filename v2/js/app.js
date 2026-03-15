// app.js — Entry point: wires store, router, UI buttons, i18n, and theme

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var t = App.I18n.t;
    var THEME_KEY = 'territory-cards-theme';

    // --- Theme toggle ---
    var themeToggle = document.getElementById('theme-toggle');
    var sunIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    var moonIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    function getTheme() {
      try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { return 'dark'; }
    }

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      themeToggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }

    applyTheme(getTheme());

    themeToggle.addEventListener('click', function () {
      applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });

    // --- Language switcher (icon + dropdown) ---
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
      moreMenu.classList.remove('open');
      langMenu.classList.toggle('open');
    });

    // --- More menu (overflow: Load/Save/Import/Reset) ---
    var moreMenu = document.getElementById('more-menu');
    var moreToggle = document.getElementById('more-toggle');
    var fileInput = document.getElementById('file-input');
    var kmlInput = document.getElementById('kml-input');

    function buildMoreMenu() {
      moreMenu.innerHTML = '';
      var items = [
        { id: 'more-load', key: 'nav.loadJson', action: function () { handleLoad(); } },
        { id: 'more-save', key: 'nav.saveJson', action: function () { handleSave(); } },
        { id: 'more-import', key: 'nav.importKml', action: function () { kmlInput.click(); } },
        { id: 'more-reset', key: 'nav.reset', action: function () { handleReset(); }, danger: true }
      ];
      items.forEach(function (item) {
        var btn = document.createElement('button');
        btn.className = 'more-menu-item' + (item.danger ? ' danger' : '');
        btn.id = item.id;
        btn.textContent = t(item.key);
        btn.addEventListener('click', function () {
          moreMenu.classList.remove('open');
          item.action();
        });
        moreMenu.appendChild(btn);
      });
    }

    buildMoreMenu();

    moreToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      langMenu.classList.remove('open');
      moreMenu.classList.toggle('open');
    });

    // Close all dropdowns on outside click
    document.addEventListener('click', function () {
      langMenu.classList.remove('open');
      moreMenu.classList.remove('open');
    });

    function updateNavbarText() {
      document.getElementById('nav-brand').textContent = t('nav.brand');
      document.getElementById('nav-print').textContent = t('nav.printAll');
      buildMoreMenu();
    }

    updateNavbarText();

    // --- Router ---
    var appContainer = document.getElementById('app');
    App.Router.init(appContainer);

    // Detect user location for map defaults
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        App.Store.setDefaultCenter(pos.coords.latitude, pos.coords.longitude);
        App.Router.refresh();
      });
    }

    // --- File handlers ---
    function handleLoad() {
      if (App.Store.getAll().length > 0) {
        if (!confirm(t('confirm.loadReplace'))) return;
      }
      fileInput.click();
    }

    function handleSave() {
      if (App.Views.Form && App.Views.Form.isDirty) {
        alert(t('alert.unsavedForm'));
        return;
      }
      App.Store.saveToFile();
    }

    function handleReset() {
      if (App.Store.getAll().length === 0) return;
      if (confirm(t('confirm.reset'))) {
        App.Store.reset();
        App.Router.refresh();
      }
    }

    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) {
        App.Store.loadFromFile(fileInput.files[0]).then(function () {
          fileInput.value = '';
          App.Router.refresh();
        }).catch(function (err) {
          alert(t('alert.errorLoadJson') + err.message);
          fileInput.value = '';
        });
      }
    });

    kmlInput.addEventListener('change', function () {
      if (kmlInput.files.length > 0) {
        App.Store.importKML(kmlInput.files[0]).then(function () {
          kmlInput.value = '';
          App.Router.refresh();
          alert(t('alert.kmlSuccess'));
        }).catch(function (err) {
          alert(t('alert.errorImportKml') + err.message);
          kmlInput.value = '';
        });
      }
    });
  });
})();
