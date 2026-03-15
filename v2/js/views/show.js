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

      var mapCleanup = null;
      var currentMap = null;
      var landmarksSection = null;

      // Header
      var header = document.createElement('div');
      header.className = 'header-row';
      header.innerHTML = '<h1>' + App.Utils.escapeHtml(territory.number) + ' - ' + App.Utils.escapeHtml(territory.name) + '</h1>' +
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

      mapCleanup = App.Components.Map.renderSingleMap(mapDiv, territory, function (latlng) {
        var name = prompt('Landmark name:');
        if (!name || name.trim() === '') return;
        var color = LANDMARK_COLORS[territory.landmarks.length % LANDMARK_COLORS.length];
        App.Store.addLandmark(territory.id, {
          name: name.trim(),
          lat: latlng.lat,
          lng: latlng.lng,
          color: color
        });
        // Re-render only the landmarks list + add marker to existing map
        territory = App.Store.getById(params.id);
        rerenderLandmarks();
        addMarkerToMap(territory.landmarks[territory.landmarks.length - 1]);
      }, function (map) {
        currentMap = map;
      });

      // Helper text
      var helper = document.createElement('p');
      helper.className = 'helper-text';
      helper.textContent = 'Click on the map to add a landmark';
      container.appendChild(helper);

      // Landmarks section container (for partial re-render)
      landmarksSection = document.createElement('div');
      container.appendChild(landmarksSection);
      rerenderLandmarks();

      // Delete territory button
      var deleteSection = document.createElement('div');
      deleteSection.style.marginTop = '2rem';
      deleteSection.style.paddingTop = '1rem';
      deleteSection.style.borderTop = '1px solid #E5E7EB';
      var deleteTerritoryBtn = document.createElement('button');
      deleteTerritoryBtn.className = 'btn btn-danger';
      deleteTerritoryBtn.textContent = 'Delete Territory';
      deleteTerritoryBtn.addEventListener('click', function () {
        if (confirm('Delete territory "' + territory.number + ' - ' + territory.name + '"? This cannot be undone.')) {
          App.Store.deleteTerritory(territory.id);
          window.location.hash = '#/';
        }
      });
      deleteSection.appendChild(deleteTerritoryBtn);
      container.appendChild(deleteSection);

      function addMarkerToMap(lm) {
        if (!currentMap) return;
        var marker = L.circleMarker([lm.lat, lm.lng], {
          radius: 8,
          fillColor: lm.color || '#3B82F6',
          color: '#1F2937',
          weight: 2,
          fillOpacity: 1
        }).addTo(currentMap);
        marker.bindTooltip(lm.name, {
          permanent: true,
          direction: 'right',
          offset: [10, 0],
          className: 'landmark-tooltip'
        });
      }

      function rerenderLandmarks() {
        territory = App.Store.getById(params.id);
        landmarksSection.innerHTML = '';

        var h3 = document.createElement('h3');
        h3.textContent = 'Landmarks';
        landmarksSection.appendChild(h3);

        if (territory.landmarks.length === 0) {
          var empty = document.createElement('p');
          empty.className = 'empty-state';
          empty.textContent = 'No landmarks yet. Click the map to add one.';
          landmarksSection.appendChild(empty);
        } else {
          var ul = document.createElement('ul');
          ul.className = 'landmarks-list';

          territory.landmarks.forEach(function (lm) {
            var li = document.createElement('li');
            li.className = 'landmark-item';

            var dot = document.createElement('span');
            dot.className = 'landmark-dot';
            dot.style.background = lm.color;

            var nameSpan = document.createElement('span');
            nameSpan.className = 'landmark-name';
            nameSpan.textContent = lm.name;

            var lat = typeof lm.lat === 'number' ? lm.lat.toFixed(6) : String(lm.lat || 0);
            var lng = typeof lm.lng === 'number' ? lm.lng.toFixed(6) : String(lm.lng || 0);
            var coordsSpan = document.createElement('span');
            coordsSpan.className = 'landmark-coords';
            coordsSpan.textContent = lat + ' - ' + lng;

            var actionsSpan = document.createElement('span');
            actionsSpan.className = 'landmark-actions';
            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', function () {
              if (confirm('Delete this landmark?')) {
                App.Store.deleteLandmark(territory.id, lm.id);
                rerenderLandmarks();
              }
            });
            actionsSpan.appendChild(deleteBtn);

            li.appendChild(dot);
            li.appendChild(nameSpan);
            li.appendChild(coordsSpan);
            li.appendChild(actionsSpan);
            ul.appendChild(li);
          });

          landmarksSection.appendChild(ul);
        }
      }

      return function () {
        if (mapCleanup) mapCleanup();
      };
    }
  };
})();
