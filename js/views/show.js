// show.js — Single territory detail + landmarks

window.App = window.App || {};
window.App.Views = window.App.Views || {};

(function () {
  var LANDMARK_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

  window.App.Views.Show = {
    render: function (container, params) {
      var t = App.I18n.t;
      var territory = App.Store.getById(params.id);
      if (!territory) {
        container.innerHTML = '<p>' + App.Utils.escapeHtml(t('alert.notFound')) + '</p><a href="#/" class="btn btn-secondary">' + App.Utils.escapeHtml(t('show.btnBack')) + '</a>';
        return null;
      }

      var mapCleanup = null;
      var currentMap = null;
      var landmarksSection = null;
      var landmarkMarkers = [];

      // Header
      var header = document.createElement('div');
      header.className = 'header-row';
      header.innerHTML = '<h1>' + App.Utils.escapeHtml(territory.number) + ' - ' + App.Utils.escapeHtml(territory.name) + '</h1>' +
        '<div>' +
          '<a href="#/territories/' + territory.id + '/card" class="btn btn-primary">' + App.Utils.escapeHtml(t('show.btnCard')) + '</a> ' +
          '<a href="#/territories/' + territory.id + '/edit" class="btn btn-secondary">' + App.Utils.escapeHtml(t('show.btnEdit')) + '</a> ' +
          '<a href="#/" class="btn btn-secondary">' + App.Utils.escapeHtml(t('show.btnBack')) + '</a>' +
        '</div>';
      if (territory.group_name) {
        var groupBadge = document.createElement('span');
        groupBadge.style.cssText = 'font-size:0.8125rem;color:#6B7280;font-weight:400;margin-left:0.75rem;';
        groupBadge.textContent = territory.group_name;
        header.querySelector('h1').appendChild(groupBadge);
      }
      container.appendChild(header);

      // Map
      var mapDiv = document.createElement('div');
      mapDiv.className = 'map-container';
      container.appendChild(mapDiv);

      mapCleanup = App.Components.Map.renderSingleMap(mapDiv, territory, function (latlng) {
        var name = prompt(t('show.promptLandmarkName'));
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
      helper.textContent = t('show.clickToAdd');
      container.appendChild(helper);

      // Landmarks section container (for partial re-render)
      landmarksSection = document.createElement('div');
      container.appendChild(landmarksSection);
      rerenderLandmarks();

      // Delete territory link
      var deleteSection = document.createElement('div');
      deleteSection.className = 'delete-section';
      var deleteTerritoryBtn = document.createElement('button');
      deleteTerritoryBtn.className = 'btn-text-danger';
      deleteTerritoryBtn.textContent = t('show.deleteTerritory');
      deleteTerritoryBtn.addEventListener('click', function () {
        if (confirm(t('show.confirmDeleteTerritory', { name: territory.number + ' - ' + territory.name }))) {
          App.Store.deleteTerritory(territory.id);
          window.location.hash = '#/';
        }
      });
      deleteSection.appendChild(deleteTerritoryBtn);
      container.appendChild(deleteSection);

      function clearMapMarkers() {
        landmarkMarkers.forEach(function (m) { if (currentMap) currentMap.removeLayer(m); });
        landmarkMarkers = [];
      }

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
        landmarkMarkers.push(marker);
      }

      function rerenderLandmarks() {
        territory = App.Store.getById(params.id);
        landmarksSection.innerHTML = '';

        var h3 = document.createElement('h3');
        h3.textContent = t('show.landmarks');
        landmarksSection.appendChild(h3);

        if (territory.landmarks.length === 0) {
          var empty = document.createElement('p');
          empty.className = 'empty-state';
          empty.textContent = t('show.noLandmarks');
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

            var actionsSpan = document.createElement('span');
            actionsSpan.className = 'landmark-actions';
            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.textContent = t('show.deleteLandmark');
            deleteBtn.addEventListener('click', function () {
              if (confirm(t('show.confirmDeleteLandmark'))) {
                App.Store.deleteLandmark(territory.id, lm.id);
                // Remove all markers from map and re-add remaining ones
                clearMapMarkers();
                territory = App.Store.getById(params.id);
                territory.landmarks.forEach(function (l) { addMarkerToMap(l); });
                rerenderLandmarks();
              }
            });
            actionsSpan.appendChild(deleteBtn);

            li.appendChild(dot);
            li.appendChild(nameSpan);
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
