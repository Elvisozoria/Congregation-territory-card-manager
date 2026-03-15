// router.js — Hash-based router
// Routes: #/ #/territories/new #/territories/:id #/territories/:id/edit #/territories/:id/card #/print

window.App = window.App || {};

(function () {
  var currentCleanup = null;
  var currentView = null;
  var container = null;
  var previousHash = '#/';

  var routes = [
    { pattern: /^#\/territories\/new$/, view: 'Form', params: function () { return { id: null }; } },
    { pattern: /^#\/territories\/(\d+)\/edit$/, view: 'Form', params: function (m) { return { id: parseInt(m[1], 10) }; } },
    { pattern: /^#\/territories\/(\d+)\/card$/, view: 'Card', params: function (m) { return { id: parseInt(m[1], 10) }; } },
    { pattern: /^#\/territories\/(\d+)$/, view: 'Show', params: function (m) { return { id: parseInt(m[1], 10) }; } },
    { pattern: /^#\/print$/, view: 'Print', params: function () { return {}; } },
    { pattern: /^#?\/?$/, view: 'Index', params: function () { return {}; } }
  ];

  function navigate() {
    var hash = window.location.hash || '#/';
    var t = App.I18n.t;

    // Guard: if leaving a dirty form, ask for confirmation
    if (currentView && App.Views[currentView] && App.Views[currentView].isDirty) {
      if (!confirm(t('confirm.unsavedChanges'))) {
        // Restore previous hash without triggering navigate again
        window.removeEventListener('hashchange', navigate);
        window.location.hash = previousHash;
        window.addEventListener('hashchange', navigate);
        return;
      }
      App.Views[currentView].isDirty = false;
    }

    previousHash = hash;

    // Clean up previous view (wrapped in try-catch to prevent orphaned state)
    if (currentCleanup) {
      try { currentCleanup(); } catch (e) { console.error('View cleanup error:', e); }
      currentCleanup = null;
    }
    currentView = null;

    container.innerHTML = '';

    for (var i = 0; i < routes.length; i++) {
      var match = hash.match(routes[i].pattern);
      if (match) {
        var viewName = routes[i].view;
        var params = routes[i].params(match);
        var view = App.Views[viewName];
        if (view && view.render) {
          currentView = viewName;
          try {
            currentCleanup = view.render(container, params);
          } catch (e) {
            console.error('View render error:', e);
            container.innerHTML = '<p style="padding:2rem;color:#991B1B;">' + App.Utils.escapeHtml(t('alert.renderError')) + '</p>' +
              '<a href="#/" class="btn btn-secondary" style="margin-left:2rem;">' + App.Utils.escapeHtml(t('alert.backToHome')) + '</a>';
          }
        }
        return;
      }
    }

    // Fallback: go to index
    window.location.hash = '#/';
  }

  window.App.Router = {
    init: function (el) {
      container = el;
      window.addEventListener('hashchange', navigate);
      navigate();
    },

    refresh: function () {
      navigate();
    }
  };
})();
