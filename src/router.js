import { t } from './i18n/i18n.js';
import { escapeHtml } from './utils/helpers.js';
import { getMode, getUserProfile } from './store/index.js';
import * as IndexView from './views/index.js';
import * as ShowView from './views/show.js';
import * as FormView from './views/form.js';
import * as CardView from './views/card.js';
import * as PrintView from './views/print.js';
import * as WelcomeView from './views/welcome.js';
import * as LoginView from './views/login.js';
import * as RegisterView from './views/register.js';
import * as ChangePasswordView from './views/change-password.js';
import * as AdminView from './views/admin.js';
import * as SettingsView from './views/settings.js';
import * as PublicTerritoryView from './views/public-territory.js';

const views = {
  Index: IndexView,
  Show: ShowView,
  Form: FormView,
  Card: CardView,
  Print: PrintView,
  Welcome: WelcomeView,
  Login: LoginView,
  Register: RegisterView,
  ChangePassword: ChangePasswordView,
  Admin: AdminView,
  Settings: SettingsView,
  PublicTerritory: PublicTerritoryView
};

const routes = [
  // Public route (sin auth, accesible para visitantes)
  { pattern: /^#\/p\/([^/]+)\/([^/]+)$/, view: 'PublicTerritory', params: function (m) { return { congPublicId: m[1], terPublicId: m[2] }; }, isPublic: true },
  // Auth / mode routes
  { pattern: /^#\/welcome$/, view: 'Welcome', params: function () { return {}; } },
  { pattern: /^#\/login$/, view: 'Login', params: function () { return {}; } },
  { pattern: /^#\/register$/, view: 'Register', params: function () { return {}; } },
  { pattern: /^#\/change-password$/, view: 'ChangePassword', params: function () { return {}; }, requiresOnline: true },
  { pattern: /^#\/admin$/, view: 'Admin', params: function () { return {}; }, allowedRoles: ['admin'] },
  { pattern: /^#\/settings$/, view: 'Settings', params: function () { return {}; } },
  // Territory routes
  { pattern: /^#\/territories\/new$/, view: 'Form', params: function () { return { id: null }; }, allowedRoles: ['admin'] },
  { pattern: /^#\/territories\/([^/]+)\/edit$/, view: 'Form', params: function (m) { return { id: parseId(m[1]) }; }, allowedRoles: ['admin'] },
  { pattern: /^#\/territories\/([^/]+)\/card$/, view: 'Card', params: function (m) { return { id: parseId(m[1]) }; } },
  { pattern: /^#\/territories\/([^/]+)$/, view: 'Show', params: function (m) { return { id: parseId(m[1]) }; } },
  { pattern: /^#\/print$/, view: 'Print', params: function () { return {}; }, allowedRoles: ['admin', 'conductor'] },
  { pattern: /^#?\/?$/, view: 'Index', params: function () { return {}; } }
];

// Parse ID — numeric for local store, string for Firestore
function parseId(raw) {
  return /^\d+$/.test(raw) ? parseInt(raw, 10) : raw;
}

let currentCleanup = null;
let currentViewName = null;
let container = null;
let previousHash = '#/';

function navigate() {
  const hash = window.location.hash || '#/';
  const mode = getMode();
  const isPublicRoute = !!hash.match(/^#\/p\//);

  // Guard: no mode selected → redirect to welcome (unless already there o ruta pública)
  if (!mode && !hash.match(/^#\/welcome/) && !isPublicRoute) {
    window.location.hash = '#/welcome';
    return;
  }

  // Guard: online mode auth checks (no aplica a rutas públicas)
  if (mode === 'online' && !isPublicRoute) {
    const profile = getUserProfile();
    const isAuthPage = hash.match(/^#\/(login|register|welcome)/);

    if (!profile && !isAuthPage) {
      // Not authenticated at all
      window.location.hash = '#/login';
      return;
    }

    if (profile && profile.needsRegistration && !isAuthPage) {
      // Authenticated but no congregation yet
      window.location.hash = '#/register';
      return;
    }
  }

  // Guard: if leaving a dirty form, ask for confirmation
  if (currentViewName && views[currentViewName] && views[currentViewName].isDirty) {
    if (!confirm(t('confirm.unsavedChanges'))) {
      window.removeEventListener('hashchange', navigate);
      window.location.hash = previousHash;
      window.addEventListener('hashchange', navigate);
      return;
    }
  }

  previousHash = hash;

  if (currentCleanup) {
    try { currentCleanup(); } catch (e) { console.error('View cleanup error:', e); }
    currentCleanup = null;
  }
  currentViewName = null;

  container.innerHTML = '';

  for (let i = 0; i < routes.length; i++) {
    const match = hash.match(routes[i].pattern);
    if (match) {
      const route = routes[i];

      // Role guard (solo aplica en modo online con perfil)
      if (route.allowedRoles && mode === 'online') {
        const profile = getUserProfile();
        if (profile && profile.role && route.allowedRoles.indexOf(profile.role) === -1) {
          window.location.hash = '#/';
          return;
        }
      }

      const viewName = route.view;
      const params = route.params(match);
      const view = views[viewName];
      if (view && view.render) {
        currentViewName = viewName;
        try {
          currentCleanup = view.render(container, params);
        } catch (e) {
          console.error('View render error:', e);
          container.innerHTML = '<p style="padding:2rem;color:#991B1B;">' + escapeHtml(t('alert.renderError')) + '</p>' +
            '<a href="#/" class="btn btn-secondary" style="margin-left:2rem;">' + escapeHtml(t('alert.backToHome')) + '</a>';
        }
      }
      return;
    }
  }

  // Fallback
  window.location.hash = '#/';
}

export function init(el) {
  container = el;
  window.addEventListener('hashchange', navigate);
  navigate();
}

export function refresh() {
  navigate();
}
