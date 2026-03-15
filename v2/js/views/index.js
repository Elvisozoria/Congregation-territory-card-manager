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

      territories.forEach(function (t) {
        tbody += '<tr>' +
          '<td class="number">' + escapeHtml(t.number) + '</td>' +
          '<td><a href="#/territories/' + t.id + '">' + escapeHtml(t.name) + '</a></td>' +
          '<td>' + escapeHtml(t.group_name || '') + '</td>' +
          '<td>' + t.landmarks.length + '</td>' +
          '<td class="actions">' +
            '<a href="#/territories/' + t.id + '/card" class="btn btn-secondary btn-sm">Card</a>' +
            '<a href="#/territories/' + t.id + '/edit" class="btn btn-primary btn-sm">Edit</a>' +
          '</td>' +
        '</tr>';
      });

      tbody += '</tbody>';
      table.innerHTML = thead + tbody;
      container.appendChild(table);

      return function () {
        if (cleanup) cleanup();
      };
    }
  };

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
