// index.js — Territory list + overview map

window.App = window.App || {};
window.App.Views = window.App.Views || {};

(function () {
  window.App.Views.Index = {
    render: function (container) {
      var territories = App.Store.getAll();
      var cleanup = null;

      // Empty state: welcome screen
      if (territories.length === 0) {
        var welcome = document.createElement('div');
        welcome.className = 'welcome-screen';

        // Map pin SVG icon
        var icon = document.createElement('div');
        icon.className = 'welcome-icon';
        icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>';
        welcome.appendChild(icon);

        var h2 = document.createElement('h2');
        h2.textContent = 'No territories yet';
        welcome.appendChild(h2);

        var p = document.createElement('p');
        p.textContent = 'Get started by creating your first territory or loading existing data.';
        welcome.appendChild(p);

        // Primary actions as cards
        var primary = document.createElement('div');
        primary.className = 'welcome-primary';

        var createCard = document.createElement('a');
        createCard.href = '#/territories/new';
        createCard.className = 'welcome-card';
        createCard.innerHTML = '<div class="welcome-card-icon blue">+</div><span class="welcome-card-title">Create Territory</span>';

        var demoCard = document.createElement('div');
        demoCard.className = 'welcome-card';
        demoCard.innerHTML = '<div class="welcome-card-icon green">&#9654;</div><span class="welcome-card-title">Load Demo</span>';
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
        loadJsonLink.textContent = 'Load JSON file';
        loadJsonLink.addEventListener('click', function () {
          document.getElementById('file-input').click();
        });

        var importKmlLink = document.createElement('button');
        importKmlLink.textContent = 'Import KML/KMZ';
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
      header.innerHTML = '<h1>Territories</h1><a href="#/territories/new" class="btn btn-primary">New Territory</a>';
      container.appendChild(header);

      // Map
      var mapDiv = document.createElement('div');
      mapDiv.className = 'map-container';
      container.appendChild(mapDiv);
      cleanup = App.Components.Map.renderOverviewMap(mapDiv, territories);

      // Table
      var table = document.createElement('table');
      table.className = 'territory-table';

      var thead = '<thead><tr><th>#</th><th>Name</th><th>Group</th><th>Landmarks</th><th></th></tr></thead>';
      table.innerHTML = thead + '<tbody></tbody>';

      var tbodyEl = table.querySelector('tbody');
      territories.forEach(function (t) {
        var tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', function (e) {
          // Don't navigate if clicking a button or link
          if (e.target.closest('a') || e.target.closest('button')) return;
          window.location.hash = '#/territories/' + t.id;
        });

        var tdNum = document.createElement('td');
        tdNum.className = 'number';
        tdNum.textContent = t.number;

        var tdName = document.createElement('td');
        var nameLink = document.createElement('a');
        nameLink.href = '#/territories/' + t.id;
        nameLink.textContent = t.name;
        tdName.appendChild(nameLink);

        var tdGroup = document.createElement('td');
        tdGroup.textContent = t.group_name || '';

        var tdLandmarks = document.createElement('td');
        tdLandmarks.textContent = t.landmarks.length;

        var tdActions = document.createElement('td');
        tdActions.className = 'actions';

        var cardLink = document.createElement('a');
        cardLink.href = '#/territories/' + t.id + '/card';
        cardLink.className = 'btn btn-secondary btn-sm';
        cardLink.textContent = 'Card';

        var editLink = document.createElement('a');
        editLink.href = '#/territories/' + t.id + '/edit';
        editLink.className = 'btn btn-secondary btn-sm';
        editLink.textContent = 'Edit';

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-outline-danger btn-sm';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', function () {
          if (confirm('Delete territory "' + t.number + ' - ' + t.name + '"?')) {
            App.Store.deleteTerritory(t.id);
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

      container.appendChild(table);

      return function () {
        if (cleanup) cleanup();
      };
    }
  };

})();
