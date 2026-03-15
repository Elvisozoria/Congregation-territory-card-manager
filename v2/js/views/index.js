// index.js — Territory list + overview map

window.App = window.App || {};
window.App.Views = window.App.Views || {};

(function () {
  window.App.Views.Index = {
    render: function (container) {
      var territories = App.Store.getAll();
      var cleanup = null;

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

      var thead = '<thead><tr><th>#</th><th>Name</th><th>Group</th><th>Landmarks</th><th>Actions</th></tr></thead>';
      var tbody = '<tbody>';

      tbody += '</tbody>';
      table.innerHTML = thead + tbody;

      // Build rows with DOM so delete buttons get event listeners
      var tbodyEl = table.querySelector('tbody');
      territories.forEach(function (t) {
        var tr = document.createElement('tr');

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
        editLink.className = 'btn btn-primary btn-sm';
        editLink.textContent = 'Edit';

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
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
