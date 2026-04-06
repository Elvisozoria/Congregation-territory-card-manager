import L from 'leaflet';
import { t } from '../i18n/i18n.js';
import { getStore } from '../store/index.js';
import { renderSingleMap } from '../components/map.js';
import { escapeHtml } from '../utils/helpers.js';

const LANDMARK_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

export let isDirty = false;

export function render(container, params) {
  const store = getStore();
  let territory = store.getById(params.id);
  if (!territory) {
    container.innerHTML = '<p>' + escapeHtml(t('alert.notFound')) + '</p><a href="#/" class="btn btn-secondary">' + escapeHtml(t('show.btnBack')) + '</a>';
    return null;
  }

  let mapCleanup = null;
  let currentMap = null;
  let landmarksSection = null;
  let landmarkMarkers = [];

  // Header
  const header = document.createElement('div');
  header.className = 'header-row';
  header.innerHTML = '<h1>' + escapeHtml(territory.number) + ' - ' + escapeHtml(territory.name) + '</h1>' +
    '<div>' +
      '<a href="#/territories/' + territory.id + '/card" class="btn btn-primary">' + escapeHtml(t('show.btnCard')) + '</a> ' +
      '<a href="#/territories/' + territory.id + '/edit" class="btn btn-secondary">' + escapeHtml(t('show.btnEdit')) + '</a> ' +
      '<a href="#/" class="btn btn-secondary">' + escapeHtml(t('show.btnBack')) + '</a>' +
    '</div>';
  if (territory.group_name) {
    const groupBadge = document.createElement('span');
    groupBadge.style.cssText = 'font-size:0.8125rem;color:#6B7280;font-weight:400;margin-left:0.75rem;';
    groupBadge.textContent = territory.group_name;
    header.querySelector('h1').appendChild(groupBadge);
  }
  container.appendChild(header);

  // Map
  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';
  container.appendChild(mapDiv);

  mapCleanup = renderSingleMap(mapDiv, territory, function (latlng) {
    const name = prompt(t('show.promptLandmarkName'));
    if (!name || name.trim() === '') return;
    const color = LANDMARK_COLORS[territory.landmarks.length % LANDMARK_COLORS.length];
    store.addLandmark(territory.id, {
      name: name.trim(),
      lat: latlng.lat,
      lng: latlng.lng,
      color: color
    });
    territory = store.getById(params.id);
    rerenderLandmarks();
    addMarkerToMap(territory.landmarks[territory.landmarks.length - 1]);
  }, function (map) {
    currentMap = map;
  });

  // Helper text
  const helper = document.createElement('p');
  helper.className = 'helper-text';
  helper.textContent = t('show.clickToAdd');
  container.appendChild(helper);

  // Landmarks section
  landmarksSection = document.createElement('div');
  container.appendChild(landmarksSection);
  rerenderLandmarks();

  // Delete territory link
  const deleteSection = document.createElement('div');
  deleteSection.className = 'delete-section';
  const deleteTerritoryBtn = document.createElement('button');
  deleteTerritoryBtn.className = 'btn-text-danger';
  deleteTerritoryBtn.textContent = t('show.deleteTerritory');
  deleteTerritoryBtn.addEventListener('click', function () {
    if (confirm(t('show.confirmDeleteTerritory', { name: territory.number + ' - ' + territory.name }))) {
      store.deleteTerritory(territory.id);
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
    const marker = L.circleMarker([lm.lat, lm.lng], {
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
    territory = store.getById(params.id);
    landmarksSection.innerHTML = '';

    const h3 = document.createElement('h3');
    h3.textContent = t('show.landmarks');
    landmarksSection.appendChild(h3);

    if (territory.landmarks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = t('show.noLandmarks');
      landmarksSection.appendChild(empty);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'landmarks-list';

      territory.landmarks.forEach(function (lm) {
        const li = document.createElement('li');
        li.className = 'landmark-item';

        const dot = document.createElement('span');
        dot.className = 'landmark-dot';
        dot.style.background = lm.color;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'landmark-name';
        nameSpan.textContent = lm.name;

        const actionsSpan = document.createElement('span');
        actionsSpan.className = 'landmark-actions';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.textContent = t('show.deleteLandmark');
        deleteBtn.addEventListener('click', function () {
          if (confirm(t('show.confirmDeleteLandmark'))) {
            store.deleteLandmark(territory.id, lm.id);
            clearMapMarkers();
            territory = store.getById(params.id);
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
