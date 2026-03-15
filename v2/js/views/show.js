// show.js — Single territory detail + landmarks

window.App = window.App || {};
window.App.Views = window.App.Views || {};

(function () {
  var LANDMARK_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

  window.App.Views.Show = {
    render: function (container, params) {
      var territory = App.Store.getById(params.id);
      if (!territory) {
        container.innerHTML = '<p>Territory not found.</p><a href="#/" class="btn btn-secondary">Back</a>';
        return null;
      }

      var cleanup = null;

      // Header
      var header = document.createElement('div');
      header.className = 'header-row';
      header.innerHTML = '<h1>' + escapeHtml(territory.number) + ' - ' + escapeHtml(territory.name) + '</h1>' +
        '<div>' +
          '<a href="#/territories/' + territory.id + '/card" class="btn btn-primary">Card</a> ' +
          '<a href="#/territories/' + territory.id + '/edit" class="btn btn-secondary">Edit</a> ' +
          '<a href="#/" class="btn btn-secondary">Back</a>' +
        '</div>';
      container.appendChild(header);

      // Map
      var mapDiv = document.createElement('div');
      mapDiv.className = 'map-container';
      container.appendChild(mapDiv);

      cleanup = App.Components.Map.renderSingleMap(mapDiv, territory, function (latlng) {
        var name = prompt('Landmark name:');
        if (!name || name.trim() === '') return;
        var color = LANDMARK_COLORS[territory.landmarks.length % LANDMARK_COLORS.length];
        App.Store.addLandmark(territory.id, {
          name: name.trim(),
          lat: latlng.lat,
          lng: latlng.lng,
          color: color
        });
        App.Router.refresh();
      });

      // Helper text
      var helper = document.createElement('p');
      helper.className = 'helper-text';
      helper.textContent = 'Click on the map to add a landmark';
      container.appendChild(helper);

      // Landmarks heading
      var h3 = document.createElement('h3');
      h3.textContent = 'Landmarks';
      container.appendChild(h3);

      // Landmarks list
      if (territory.landmarks.length === 0) {
        var empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'No landmarks yet. Click the map to add one.';
        container.appendChild(empty);
      } else {
        var ul = document.createElement('ul');
        ul.className = 'landmarks-list';

        territory.landmarks.forEach(function (lm) {
          var li = document.createElement('li');
          li.className = 'landmark-item';

          var dot = document.createElement('span');
          dot.className = 'landmark-dot';
          dot.style.background = lm.color;
          li.appendChild(dot);

          li.innerHTML +=
            '<span class="landmark-name">' + escapeHtml(lm.name) + '</span>' +
            '<span class="landmark-coords">' + lm.lat.toFixed(6) + ' - ' + lm.lng.toFixed(6) + '</span>' +
            '<span class="landmark-actions"></span>';

          var deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-danger btn-sm';
          deleteBtn.textContent = 'Delete';
          deleteBtn.addEventListener('click', function () {
            if (confirm('Delete this landmark?')) {
              App.Store.deleteLandmark(territory.id, lm.id);
              App.Router.refresh();
            }
          });
          li.querySelector('.landmark-actions').appendChild(deleteBtn);

          ul.appendChild(li);
        });

        container.appendChild(ul);
      }

      // Delete territory button
      var deleteSection = document.createElement('div');
      deleteSection.style.marginTop = '2rem';
      deleteSection.style.paddingTop = '1rem';
      deleteSection.style.borderTop = '1px solid #E5E7EB';
      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger';
      deleteBtn.textContent = 'Delete Territory';
      deleteBtn.addEventListener('click', function () {
        if (confirm('Delete territory "' + territory.number + ' - ' + territory.name + '"? This cannot be undone.')) {
          App.Store.deleteTerritory(territory.id);
          window.location.hash = '#/';
        }
      });
      deleteSection.appendChild(deleteBtn);
      container.appendChild(deleteSection);

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
