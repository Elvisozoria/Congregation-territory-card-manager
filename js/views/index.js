// index.js — Territory list + overview map

window.App = window.App || {};
window.App.Views = window.App.Views || {};

(function () {
  var VIEW_KEY = 'territory-cards-view';

  function getViewPref() {
    try { return localStorage.getItem(VIEW_KEY) || 'cards'; } catch (e) { return 'cards'; }
  }

  function setViewPref(view) {
    try { localStorage.setItem(VIEW_KEY, view); } catch (e) {}
  }

  window.App.Views.Index = {
    render: function (container) {
      var t = App.I18n.t;
      var territories = App.Store.getAll();
      var cleanup = null;

      // Empty state: welcome screen
      if (territories.length === 0) {
        var welcome = document.createElement('div');
        welcome.className = 'welcome-screen';

        var icon = document.createElement('div');
        icon.className = 'welcome-icon';
        icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>';
        welcome.appendChild(icon);

        var h2 = document.createElement('h2');
        h2.textContent = t('welcome.title');
        welcome.appendChild(h2);

        var p = document.createElement('p');
        p.textContent = t('welcome.subtitle');
        welcome.appendChild(p);

        var primary = document.createElement('div');
        primary.className = 'welcome-primary';

        var createCard = document.createElement('a');
        createCard.href = '#/territories/new';
        createCard.className = 'welcome-card';
        createCard.innerHTML = '<div class="welcome-card-icon blue">+</div><span class="welcome-card-title">' + App.Utils.escapeHtml(t('welcome.createTerritory')) + '</span>';

        var demoCard = document.createElement('div');
        demoCard.className = 'welcome-card';
        demoCard.innerHTML = '<div class="welcome-card-icon green">&#9654;</div><span class="welcome-card-title">' + App.Utils.escapeHtml(t('welcome.loadDemo')) + '</span>';
        demoCard.addEventListener('click', function () {
          App.Store.loadSample();
          App.Router.refresh();
        });

        primary.appendChild(createCard);
        primary.appendChild(demoCard);
        welcome.appendChild(primary);

        var secondary = document.createElement('div');
        secondary.className = 'welcome-secondary';

        var loadJsonLink = document.createElement('button');
        loadJsonLink.textContent = t('welcome.loadJson');
        loadJsonLink.addEventListener('click', function () {
          document.getElementById('file-input').click();
        });

        var importKmlLink = document.createElement('button');
        importKmlLink.textContent = t('welcome.importKml');
        importKmlLink.addEventListener('click', function () {
          document.getElementById('kml-input').click();
        });

        secondary.appendChild(loadJsonLink);
        secondary.appendChild(importKmlLink);
        welcome.appendChild(secondary);
        container.appendChild(welcome);
        return null;
      }

      // Header row with view toggle
      var header = document.createElement('div');
      header.className = 'header-row';

      var headerLeft = document.createElement('div');
      headerLeft.style.cssText = 'display:flex;align-items:center;gap:0.75rem;';
      var h1 = document.createElement('h1');
      h1.textContent = t('index.title');
      headerLeft.appendChild(h1);

      // View toggle (cards / table)
      var viewToggle = document.createElement('div');
      viewToggle.className = 'view-toggle';

      var gridIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
      var listIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';

      var btnCards = document.createElement('button');
      btnCards.className = 'view-toggle-btn' + (getViewPref() === 'cards' ? ' active' : '');
      btnCards.innerHTML = gridIcon;
      btnCards.title = 'Cards';

      var btnTable = document.createElement('button');
      btnTable.className = 'view-toggle-btn' + (getViewPref() === 'table' ? ' active' : '');
      btnTable.innerHTML = listIcon;
      btnTable.title = 'Table';

      viewToggle.appendChild(btnCards);
      viewToggle.appendChild(btnTable);
      headerLeft.appendChild(viewToggle);
      header.appendChild(headerLeft);

      var newBtn = document.createElement('a');
      newBtn.href = '#/territories/new';
      newBtn.className = 'btn btn-primary';
      newBtn.textContent = t('index.newTerritory');
      header.appendChild(newBtn);
      container.appendChild(header);

      // Map
      var mapDiv = document.createElement('div');
      mapDiv.className = 'map-container';
      container.appendChild(mapDiv);
      cleanup = App.Components.Map.renderOverviewMap(mapDiv, territories);

      // Content area (cards or table)
      var contentArea = document.createElement('div');
      container.appendChild(contentArea);

      function renderCards() {
        contentArea.innerHTML = '';
        var grid = document.createElement('div');
        grid.className = 'territory-grid';

        territories.forEach(function (territory) {
          var card = document.createElement('a');
          card.href = '#/territories/' + territory.id;
          card.className = 'territory-grid-card';

          var cardHeader = document.createElement('div');
          cardHeader.className = 'territory-grid-card-header';
          var num = document.createElement('span');
          num.className = 'territory-grid-card-number';
          num.textContent = territory.number;
          cardHeader.appendChild(num);
          if (territory.group_name) {
            var group = document.createElement('span');
            group.className = 'territory-grid-card-group';
            group.textContent = territory.group_name;
            cardHeader.appendChild(group);
          }
          card.appendChild(cardHeader);

          var name = document.createElement('div');
          name.className = 'territory-grid-card-name';
          name.textContent = territory.name;
          card.appendChild(name);

          var meta = document.createElement('div');
          meta.className = 'territory-grid-card-meta';
          meta.innerHTML = '<span>' + territory.landmarks.length + ' ' + App.Utils.escapeHtml(t('index.colLandmarks').toLowerCase()) + '</span>';
          card.appendChild(meta);

          var actions = document.createElement('div');
          actions.className = 'territory-grid-card-actions';

          var cardLink = document.createElement('a');
          cardLink.href = '#/territories/' + territory.id + '/card';
          cardLink.className = 'btn btn-secondary btn-sm';
          cardLink.textContent = t('index.btnCard');
          cardLink.addEventListener('click', function (e) { e.stopPropagation(); });

          var editLink = document.createElement('a');
          editLink.href = '#/territories/' + territory.id + '/edit';
          editLink.className = 'btn btn-secondary btn-sm';
          editLink.textContent = t('index.btnEdit');
          editLink.addEventListener('click', function (e) { e.stopPropagation(); });

          var deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn-outline-danger btn-sm';
          deleteBtn.textContent = t('index.btnDelete');
          deleteBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(t('confirm.deleteTerritory', { number: territory.number, name: territory.name }))) {
              App.Store.deleteTerritory(territory.id);
              App.Router.refresh();
            }
          });

          actions.appendChild(cardLink);
          actions.appendChild(editLink);
          actions.appendChild(deleteBtn);
          card.appendChild(actions);
          grid.appendChild(card);
        });

        contentArea.appendChild(grid);
      }

      function renderTable() {
        contentArea.innerHTML = '';
        var table = document.createElement('table');
        table.className = 'territory-table';

        var thead = '<thead><tr><th>' + App.Utils.escapeHtml(t('index.colNumber')) + '</th><th>' + App.Utils.escapeHtml(t('index.colName')) + '</th><th>' + App.Utils.escapeHtml(t('index.colGroup')) + '</th><th>' + App.Utils.escapeHtml(t('index.colLandmarks')) + '</th><th></th></tr></thead>';
        table.innerHTML = thead + '<tbody></tbody>';

        var tbodyEl = table.querySelector('tbody');
        territories.forEach(function (territory) {
          var tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', function (e) {
            if (e.target.closest('a') || e.target.closest('button')) return;
            window.location.hash = '#/territories/' + territory.id;
          });

          var tdNum = document.createElement('td');
          tdNum.className = 'number';
          tdNum.textContent = territory.number;

          var tdName = document.createElement('td');
          var nameLink = document.createElement('a');
          nameLink.href = '#/territories/' + territory.id;
          nameLink.textContent = territory.name;
          tdName.appendChild(nameLink);

          var tdGroup = document.createElement('td');
          tdGroup.textContent = territory.group_name || '';

          var tdLandmarks = document.createElement('td');
          tdLandmarks.textContent = territory.landmarks.length;

          var tdActions = document.createElement('td');
          tdActions.className = 'actions';

          var cardLink = document.createElement('a');
          cardLink.href = '#/territories/' + territory.id + '/card';
          cardLink.className = 'btn btn-secondary btn-sm';
          cardLink.textContent = t('index.btnCard');

          var editLink = document.createElement('a');
          editLink.href = '#/territories/' + territory.id + '/edit';
          editLink.className = 'btn btn-secondary btn-sm';
          editLink.textContent = t('index.btnEdit');

          var deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn-outline-danger btn-sm';
          deleteBtn.textContent = t('index.btnDelete');
          deleteBtn.addEventListener('click', function () {
            if (confirm(t('confirm.deleteTerritory', { number: territory.number, name: territory.name }))) {
              App.Store.deleteTerritory(territory.id);
              App.Router.refresh();
            }
          });

          tdActions.appendChild(cardLink);
          tdActions.appendChild(editLink);
          tdActions.appendChild(deleteBtn);

          tr.appendChild(tdNum);
          tr.appendChild(tdName);
          tr.appendChild(tdGroup);
          tr.appendChild(tdLandmarks);
          tr.appendChild(tdActions);
          tbodyEl.appendChild(tr);
        });

        contentArea.appendChild(table);
      }

      // Toggle handlers
      function switchView(view) {
        setViewPref(view);
        btnCards.classList.toggle('active', view === 'cards');
        btnTable.classList.toggle('active', view === 'table');
        if (view === 'cards') renderCards(); else renderTable();
      }

      btnCards.addEventListener('click', function () { switchView('cards'); });
      btnTable.addEventListener('click', function () { switchView('table'); });

      // Initial render
      if (getViewPref() === 'table') renderTable(); else renderCards();

      return function () {
        if (cleanup) cleanup();
      };
    }
  };

})();
