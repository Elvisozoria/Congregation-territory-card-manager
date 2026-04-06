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
  Settings: SettingsView
};

const routes = [
  // Auth / mode routes
  { pattern: /^#\/welcome$/, view: 'Welcome', params: function () { return {}; } },
  { pattern: /^#\/login$/, view: 'Login', params: function () { return {}; } },
  { pattern: /^#\/register$/, view: 'Register', params: function () { return {}; } },
  { pattern: /^#\/change-password$/, view: 'ChangePassword', params: function () { return {}; }, requiresOnline: true },
  { pattern: /^#\/admin$/, view: 'Admin', params: function () { return {}; }, requiresAdmin: true },
  { pattern: /^#\/settings$/, view: 'Settings', params: function () { return {}; } },
  // Territory routes
  { pattern: /^#\/territories\/new$/, view: 'Form', params: function () { return { id: null }; } },
  { pattern: /^#\/territories\/([^/]+)\/edit$/, view: 'Form', params: function (m) { return { id: parseId(m[1]) }; } },
  { pattern: /^#\/territories\/([^/]+)\/card$/, view: 'Card', params: function (m) { return { id: parseId(m[1]) }; } },
  { pattern: /^#\/territories\/([^/]+)$/, view: 'Show', params: function (m) { return { id: parseId(m[1]) }; } },
  { pattern: /^#\/print$/, view: 'Print', params: function () { return {}; } },
  { pattern: /^#?\/?$/, view: 'Index', params: function () { return {}; } }
];

// Parse ID — numeric for local store, string for Firestore
function parseId(raw) {
  const num = parseInt(raw, 10);
  return isNaN(num) ? raw : num;
}

let currentCleanup = null;
let currentViewName = null;
let container = null;
let previousHash = '#/';

function navigate() {
  const hash = window.location.hash || '#/';
  const mode = getMode();

  // Guard: no mode selected → redirect to welcome (unless already there)
  if (!mode && !hash.match(/^#\/welcome/)) {
    window.location.hash = '#/welcome';
    return;
  }

  // Guard: online mode, not authenticated, and not on auth pages
  if (mode === 'online') {
    const profile = getUserProfile();
    const isAuthPage = hash.match(/^#\/(login|register|welcome)/);
    if (!profile && !isAuthPage) {
      window.location.hash = '#/login';
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

      // Admin guard
      if (route.requiresAdmin) {
        const profile = getUserProfile();
        if (!profile || profile.role !== 'admin') {
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
