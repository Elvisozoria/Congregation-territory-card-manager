import { t } from './i18n/i18n.js';
import { escapeHtml } from './utils/helpers.js';
import * as IndexView from './views/index.js';
import * as ShowView from './views/show.js';
import * as FormView from './views/form.js';
import * as CardView from './views/card.js';
import * as PrintView from './views/print.js';

const views = {
  Index: IndexView,
  Show: ShowView,
  Form: FormView,
  Card: CardView,
  Print: PrintView
};

const routes = [
  { pattern: /^#\/territories\/new$/, view: 'Form', params: function () { return { id: null }; } },
  { pattern: /^#\/territories\/(\d+)\/edit$/, view: 'Form', params: function (m) { return { id: parseInt(m[1], 10) }; } },
  { pattern: /^#\/territories\/(\d+)\/card$/, view: 'Card', params: function (m) { return { id: parseInt(m[1], 10) }; } },
  { pattern: /^#\/territories\/(\d+)$/, view: 'Show', params: function (m) { return { id: parseInt(m[1], 10) }; } },
  { pattern: /^#\/print$/, view: 'Print', params: function () { return {}; } },
  { pattern: /^#?\/?$/, view: 'Index', params: function () { return {}; } }
];

let currentCleanup = null;
let currentViewName = null;
let container = null;
let previousHash = '#/';

function navigate() {
  const hash = window.location.hash || '#/';

  // Guard: if leaving a dirty form, ask for confirmation
  if (currentViewName && views[currentViewName] && views[currentViewName].isDirty) {
    if (!confirm(t('confirm.unsavedChanges'))) {
      window.removeEventListener('hashchange', navigate);
      window.location.hash = previousHash;
      window.addEventListener('hashchange', navigate);
      return;
    }
    // Reset dirty flag via module — views export isDirty as let
    // We need to use the form module's exported setter or just proceed
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
      const viewName = routes[i].view;
      const params = routes[i].params(match);
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

  // Fallback: go to index
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
