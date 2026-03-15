// index.js — Territory list + overview map

window.App = window.App || {};
window.App.Views = window.App.Views || {};

(function () {
  window.App.Views.Index = {
    render: function (container) {
      var t = App.I18n.t;
      var territories = App.Store.getAll();
      var cleanup = null;

      // Empty state: welcome screen
      if (territories.length === 0) {
        var welcome = document.createElement('div');
        welcome.className = 'welcome-screen';

        // Map pin SVG icon
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

        // Primary actions as cards
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

        // Secondary actions as text links
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

      // Header row
      var header = document.createElement('div');
      header.className = 'header-row';
      header.innerHTML = '<h1>' + App.Utils.escapeHtml(t('index.title')) + '</h1><a href="#/territories/new" class="btn btn-primary">' + App.Utils.escapeHtml(t('index.newTerritory')) + '</a>';
      container.appendChild(header);

      // Map
      var mapDiv = document.createElement('div');
      mapDiv.className = 'map-container';
      container.appendChild(mapDiv);
      cleanup = App.Components.Map.renderOverviewMap(mapDiv, territories);

      // Territory cards grid
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

        // Actions row
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

      container.appendChild(grid);

      return function () {
        if (cleanup) cleanup();
      };
    }
  };

})();
