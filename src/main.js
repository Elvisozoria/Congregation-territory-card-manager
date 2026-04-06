import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import '../css/styles.css';

import { t, getLang, setLang, getAvailableLanguages, languages } from './i18n/i18n.js';
import { getStore, getMode, getUserProfile, initStore } from './store/index.js';
import { init as initRouter, refresh } from './router.js';
import { isDirty as isFormDirty } from './views/form.js';

document.addEventListener('DOMContentLoaded', function () {
  const THEME_KEY = 'territory-cards-theme';
  const mode = getMode();

  // --- Theme toggle ---
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moonIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { return 'dark'; }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
  }

  applyTheme(getTheme());

  themeToggle.addEventListener('click', function () {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  });

  // --- Language switcher (icon + dropdown) ---
  const langSwitcher = document.getElementById('lang-switcher');
  const availableLangs = getAvailableLanguages();

  const langToggle = document.createElement('button');
  langToggle.className = 'lang-toggle';
  langToggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 0"/><path d="M4 6l8 0"/><path d="M8 6l0-2"/><path d="M6 12c.53-2.27 2.05-4 4-4"/><path d="M13 18l2-5 2 5"/><path d="M13.5 16.5h3"/><path d="M3 21c3-4.5 6-7.5 12-10.5"/></svg>';
  langSwitcher.appendChild(langToggle);

  const langMenu = document.createElement('div');
  langMenu.className = 'lang-menu';

  availableLangs.forEach(function (lang) {
    const item = document.createElement('button');
    item.className = 'lang-menu-item' + (lang === getLang() ? ' active' : '');
    item.textContent = languages[lang]._name;
    item.addEventListener('click', function () {
      setLang(lang);
      langMenu.querySelectorAll('.lang-menu-item').forEach(function (b) { b.classList.remove('active'); });
      item.classList.add('active');
      langMenu.classList.remove('open');
      updateNavbarText();
      refresh();
    });
    langMenu.appendChild(item);
  });

  langSwitcher.appendChild(langMenu);

  langToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    const mm = document.getElementById('more-menu');
    if (mm) mm.classList.remove('open');
    langMenu.classList.toggle('open');
  });

  // --- Navbar: conditional based on mode ---
  const navActions = document.querySelector('.navbar-actions');
  const moreMenuWrapper = document.getElementById('more-menu-wrapper');
  const navPrint = document.getElementById('nav-print');
  const fileInput = document.getElementById('file-input');
  const kmlInput = document.getElementById('kml-input');

  // For online mode: add user menu items
  if (mode === 'online') {
    // Hide offline-only elements (file inputs, more menu)
    if (moreMenuWrapper) moreMenuWrapper.style.display = 'none';
    if (fileInput) fileInput.style.display = 'none';
    if (kmlInput) kmlInput.style.display = 'none';

    // Add user menu button (will show after auth resolves)
    const userMenu = document.createElement('div');
    userMenu.className = 'more-menu-wrapper';
    userMenu.id = 'user-menu-wrapper';
    userMenu.innerHTML =
      '<button class="more-toggle user-menu-toggle" id="user-menu-toggle" title="User menu">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
      '</button>' +
      '<div class="more-menu" id="user-menu"></div>';
    navActions.insertBefore(userMenu, navPrint.nextSibling);

    const userMenuBtn = document.getElementById('user-menu-toggle');
    const userMenuDropdown = document.getElementById('user-menu');

    userMenuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      langMenu.classList.remove('open');
      userMenuDropdown.classList.toggle('open');
    });
  }

  // --- More menu (offline mode only) ---
  if (mode !== 'online') {
    const moreMenu = document.getElementById('more-menu');
    const moreToggle = document.getElementById('more-toggle');

    function buildMoreMenu() {
      moreMenu.innerHTML = '';
      const items = [
        { id: 'more-load', key: 'nav.loadJson', action: function () { handleLoad(); } },
        { id: 'more-save', key: 'nav.saveJson', action: function () { handleSave(); } },
        { id: 'more-import', key: 'nav.importKml', action: function () { kmlInput.click(); } },
        { id: 'more-settings', key: 'settings.title', action: function () { window.location.hash = '#/settings'; } },
        { id: 'more-reset', key: 'nav.reset', action: function () { handleReset(); }, danger: true }
      ];
      items.forEach(function (item) {
        const btn = document.createElement('button');
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

    // Store buildMoreMenu for navbar text update
    window._buildMoreMenu = buildMoreMenu;
  }

  // Close all dropdowns on outside click
  document.addEventListener('click', function () {
    langMenu.classList.remove('open');
    const mm = document.getElementById('more-menu');
    if (mm) mm.classList.remove('open');
    const um = document.getElementById('user-menu');
    if (um) um.classList.remove('open');
  });

  function updateNavbarText() {
    document.getElementById('nav-brand').textContent = t('nav.brand');
    document.getElementById('nav-print').textContent = t('nav.printAll');
    if (window._buildMoreMenu) window._buildMoreMenu();
    if (mode === 'online') buildUserMenu();
  }

  function buildUserMenu() {
    const userMenuDropdown = document.getElementById('user-menu');
    if (!userMenuDropdown) return;
    const profile = getUserProfile();
    userMenuDropdown.innerHTML = '';

    if (!profile) return;

    // Display name header
    const nameItem = document.createElement('div');
    nameItem.className = 'more-menu-item';
    nameItem.style.cssText = 'font-weight:600;cursor:default;opacity:0.7;';
    nameItem.textContent = profile.displayName || profile.email;
    userMenuDropdown.appendChild(nameItem);

    const items = [
      { key: 'settings.title', action: function () { window.location.hash = '#/settings'; } }
    ];

    if (profile.role === 'admin') {
      items.unshift({ key: 'admin.title', action: function () { window.location.hash = '#/admin'; } });
    }

    items.push({
      key: 'settings.logout',
      action: async function () {
        const { signOut } = await import('./firebase/auth.js');
        await signOut();
        window.location.hash = '#/login';
        window.location.reload();
      },
      danger: true
    });

    items.forEach(function (item) {
      const btn = document.createElement('button');
      btn.className = 'more-menu-item' + (item.danger ? ' danger' : '');
      btn.textContent = t(item.key);
      btn.addEventListener('click', function () {
        userMenuDropdown.classList.remove('open');
        item.action();
      });
      userMenuDropdown.appendChild(btn);
    });
  }

  updateNavbarText();

  // --- Initialize store and router ---
  initStore().then(function () {
    if (mode === 'online') {
      buildUserMenu();
    }

    const appContainer = document.getElementById('app');
    initRouter(appContainer);

    // Detect user location for map defaults
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        const store = getStore();
        if (store) {
          store.setDefaultCenter(pos.coords.latitude, pos.coords.longitude);
          refresh();
        }
      });
    }
  });

  // --- File handlers (offline mode only) ---
  function handleLoad() {
    const store = getStore();
    if (store.getAll().length > 0) {
      if (!confirm(t('confirm.loadReplace'))) return;
    }
    fileInput.click();
  }

  function handleSave() {
    if (isFormDirty) {
      alert(t('alert.unsavedForm'));
      return;
    }
    const store = getStore();
    store.saveToFile();
  }

  function handleReset() {
    const store = getStore();
    if (store.getAll().length === 0) return;
    if (confirm(t('confirm.reset'))) {
      store.reset();
      refresh();
    }
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) {
        const store = getStore();
        store.loadFromFile(fileInput.files[0]).then(function () {
          fileInput.value = '';
          refresh();
        }).catch(function (err) {
          alert(t('alert.errorLoadJson') + err.message);
          fileInput.value = '';
        });
      }
    });
  }

  if (kmlInput) {
    kmlInput.addEventListener('click', function () {
      if (kmlInput.files && kmlInput.files.length > 0) {
        const store = getStore();
        store.importKML(kmlInput.files[0]).then(function () {
          kmlInput.value = '';
          refresh();
          alert(t('alert.kmlSuccess'));
        }).catch(function (err) {
          alert(t('alert.errorImportKml') + err.message);
          kmlInput.value = '';
        });
      }
    });

    kmlInput.addEventListener('change', function () {
      if (kmlInput.files.length > 0) {
        const store = getStore();
        store.importKML(kmlInput.files[0]).then(function () {
          kmlInput.value = '';
          refresh();
          alert(t('alert.kmlSuccess'));
        }).catch(function (err) {
          alert(t('alert.errorImportKml') + err.message);
          kmlInput.value = '';
        });
      }
    });
  }
});
