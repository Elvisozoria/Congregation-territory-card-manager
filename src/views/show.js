import L from 'leaflet';
import 'leaflet-draw';
import { t } from '../i18n/i18n.js';
import { getStore } from '../store/index.js';
import { renderSingleMap } from '../components/map.js';
import { escapeHtml } from '../utils/helpers.js';

const LANDMARK_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
const BLOCK_COLORS = ['#F59E0B', '#10B981', '#8B5CF6', '#3B82F6', '#EF4444', '#EC4899'];

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
  let blockLayers = [];
  let pendingLatlng = null;
  let drawControl = null;

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
    groupBadge.style.cssText = 'font-size:0.8125rem;color:var(--text-secondary);font-weight:400;margin-left:0.75rem;';
    groupBadge.textContent = territory.group_name;
    header.querySelector('h1').appendChild(groupBadge);
  }
  container.appendChild(header);

  // Assignment banner (F4)
  const assignmentBanner = document.createElement('div');
  assignmentBanner.className = 'assignment-banner';
  container.appendChild(assignmentBanner);
  rerenderAssignmentBanner();

  // Map
  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';
  container.appendChild(mapDiv);

  mapCleanup = renderSingleMap(mapDiv, territory, function (latlng) {
    // Show inline landmark form instead of prompt
    pendingLatlng = latlng;
    showLandmarkForm();
  }, function (map) {
    currentMap = map;
    drawBlocksOnMap();
    drawGlobalLandmarksOnMap();
  });

  // Helper text
  const helper = document.createElement('p');
  helper.className = 'helper-text';
  helper.textContent = t('show.clickToAdd');
  container.appendChild(helper);

  // Landmark form container (inline, hidden initially)
  const landmarkFormContainer = document.createElement('div');
  landmarkFormContainer.style.display = 'none';
  container.appendChild(landmarkFormContainer);

  // Territory notes (F2)
  if (territory.notes) {
    const notesDiv = document.createElement('div');
    notesDiv.className = 'territory-notes';
    notesDiv.innerHTML = '<h3>' + escapeHtml(t('show.notes')) + '</h3><p>' + escapeHtml(territory.notes) + '</p>';
    container.appendChild(notesDiv);
  }

  // Landmarks section
  landmarksSection = document.createElement('div');
  container.appendChild(landmarksSection);
  rerenderLandmarks();

  // Blocks section (F1)
  const blocksSection = document.createElement('div');
  blocksSection.className = 'blocks-section';
  container.appendChild(blocksSection);
  rerenderBlocks();

  // History section
  const historySection = document.createElement('div');
  historySection.className = 'history-section';
  container.appendChild(historySection);
  rerenderHistory();

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

  // --- Map helpers ---

  function clearMapMarkers() {
    landmarkMarkers.forEach(function (m) { if (currentMap) currentMap.removeLayer(m); });
    landmarkMarkers = [];
  }

  function addMarkerToMap(lm, isGlobal) {
    if (!currentMap) return;
    const opts = isGlobal
      ? { radius: 7, fillColor: '#9CA3AF', color: '#6B7280', weight: 2, fillOpacity: 0.8, dashArray: '4 2' }
      : { radius: 8, fillColor: lm.color || '#3B82F6', color: '#1F2937', weight: 2, fillOpacity: 1 };
    const marker = L.circleMarker([lm.lat, lm.lng], opts).addTo(currentMap);
    marker.bindTooltip(lm.name, {
      permanent: true,
      direction: 'right',
      offset: [10, 0],
      className: 'landmark-tooltip' + (isGlobal ? ' global-tooltip' : '')
    });
    landmarkMarkers.push(marker);
  }

  function drawGlobalLandmarksOnMap() {
    if (!currentMap || !store.getGlobalLandmarks) return;
    const globals = store.getGlobalLandmarks();
    globals.forEach(function (lm) { addMarkerToMap(lm, true); });
  }

  function drawBlocksOnMap() {
    if (!currentMap) return;
    clearBlockLayers();
    const blocks = territory.blocks || [];
    blocks.forEach(function (block, index) {
      if (!block.polygon || block.polygon.length < 3) return;
      const coords = block.polygon.map(function (c) { return [c[1], c[0]]; });
      const color = BLOCK_COLORS[index % BLOCK_COLORS.length];
      const poly = L.polygon(coords, {
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.15,
        dashArray: '5 5'
      }).addTo(currentMap);

      const center = poly.getBounds().getCenter();
      const label = L.divIcon({
        className: '',
        html: '<span class="block-label">' + escapeHtml(block.number) + '</span>',
        iconSize: null
      });
      const labelMarker = L.marker(center, { icon: label, interactive: false }).addTo(currentMap);
      blockLayers.push(poly, labelMarker);
    });
  }

  function clearBlockLayers() {
    blockLayers.forEach(function (l) { if (currentMap) currentMap.removeLayer(l); });
    blockLayers = [];
  }

  // --- Inline landmark form (F2 + F3) ---

  function showLandmarkForm() {
    landmarkFormContainer.style.display = 'block';
    landmarkFormContainer.innerHTML = '';

    const form = document.createElement('div');
    form.className = 'landmark-form';
    form.innerHTML =
      '<h4>' + escapeHtml(t('show.addLandmarkTitle')) + '</h4>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('show.addLandmarkName')) + '</label>' +
        '<input type="text" class="history-input" data-field="lm-name" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('show.addLandmarkDesc')) + '</label>' +
        '<input type="text" class="history-input" data-field="lm-desc" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('show.scopeLocal')) + '</label>' +
        '<div class="scope-toggle">' +
          '<button class="scope-btn active" data-scope="local">' + escapeHtml(t('show.scopeLocal')) + '</button>' +
          '<button class="scope-btn" data-scope="global">' + escapeHtml(t('show.scopeGlobal')) + '</button>' +
        '</div>' +
      '</div>';

    let selectedScope = 'local';
    const scopeBtns = form.querySelectorAll('.scope-btn');
    scopeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        scopeBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selectedScope = btn.dataset.scope;
      });
    });

    const btnRow = document.createElement('div');
    btnRow.className = 'history-form-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-sm';
    saveBtn.textContent = t('show.addLandmarkSave');
    saveBtn.addEventListener('click', function () {
      const name = form.querySelector('[data-field="lm-name"]').value.trim();
      const description = form.querySelector('[data-field="lm-desc"]').value.trim();
      if (!name || !pendingLatlng) return;

      const color = LANDMARK_COLORS[territory.landmarks.length % LANDMARK_COLORS.length];

      if (selectedScope === 'global') {
        store.addGlobalLandmark({
          name, description,
          lat: pendingLatlng.lat,
          lng: pendingLatlng.lng,
          color: '#9CA3AF'
        });
        addMarkerToMap({ name, description, lat: pendingLatlng.lat, lng: pendingLatlng.lng }, true);
      } else {
        store.addLandmark(territory.id, {
          name, description,
          lat: pendingLatlng.lat,
          lng: pendingLatlng.lng,
          color: color
        });
        territory = store.getById(params.id);
        addMarkerToMap(territory.landmarks[territory.landmarks.length - 1], false);
      }

      landmarkFormContainer.style.display = 'none';
      pendingLatlng = null;
      rerenderLandmarks();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary btn-sm';
    cancelBtn.textContent = t('show.addLandmarkCancel');
    cancelBtn.addEventListener('click', function () {
      landmarkFormContainer.style.display = 'none';
      pendingLatlng = null;
    });

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);
    landmarkFormContainer.appendChild(form);
    form.querySelector('[data-field="lm-name"]').focus();
  }

  // --- Landmarks list ---

  function rerenderLandmarks() {
    territory = store.getById(params.id);
    landmarksSection.innerHTML = '';

    const h3 = document.createElement('h3');
    h3.textContent = t('show.landmarks');
    landmarksSection.appendChild(h3);

    const localLandmarks = territory.landmarks || [];
    const globalLandmarks = store.getGlobalLandmarks ? store.getGlobalLandmarks() : [];
    const allEmpty = localLandmarks.length === 0 && globalLandmarks.length === 0;

    if (allEmpty) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = t('show.noLandmarks');
      landmarksSection.appendChild(empty);
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'landmarks-list';

    // Local landmarks
    localLandmarks.forEach(function (lm) {
      ul.appendChild(buildLandmarkItem(lm, false));
    });

    // Global landmarks
    globalLandmarks.forEach(function (lm) {
      ul.appendChild(buildLandmarkItem(lm, true));
    });

    landmarksSection.appendChild(ul);
  }

  function buildLandmarkItem(lm, isGlobal) {
    const li = document.createElement('li');
    li.className = 'landmark-item';

    const dot = document.createElement('span');
    dot.className = 'landmark-dot';
    dot.style.background = isGlobal ? '#9CA3AF' : lm.color;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'landmark-info';

    const nameRow = document.createElement('span');
    nameRow.className = 'landmark-name';
    nameRow.textContent = lm.name;
    if (isGlobal) {
      const badge = document.createElement('span');
      badge.className = 'global-badge';
      badge.textContent = t('show.globalBadge');
      nameRow.appendChild(document.createTextNode(' '));
      nameRow.appendChild(badge);
    }
    infoDiv.appendChild(nameRow);

    if (lm.description) {
      const descRow = document.createElement('div');
      descRow.className = 'landmark-description';
      descRow.textContent = lm.description;
      infoDiv.appendChild(descRow);
    }

    const actionsSpan = document.createElement('span');
    actionsSpan.className = 'landmark-actions';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.textContent = t('show.deleteLandmark');
    deleteBtn.addEventListener('click', function () {
      if (confirm(t('show.confirmDeleteLandmark'))) {
        if (isGlobal) {
          store.deleteGlobalLandmark(lm.id);
        } else {
          store.deleteLandmark(territory.id, lm.id);
        }
        clearMapMarkers();
        territory = store.getById(params.id);
        territory.landmarks.forEach(function (l) { addMarkerToMap(l, false); });
        drawGlobalLandmarksOnMap();
        rerenderLandmarks();
      }
    });
    actionsSpan.appendChild(deleteBtn);

    li.appendChild(dot);
    li.appendChild(infoDiv);
    li.appendChild(actionsSpan);
    return li;
  }

  // --- Blocks (manzanas) F1 ---

  function rerenderBlocks() {
    territory = store.getById(params.id);
    blocksSection.innerHTML = '';

    const headerRow = document.createElement('div');
    headerRow.className = 'history-header';

    const h3 = document.createElement('h3');
    h3.textContent = t('show.blocks');
    headerRow.appendChild(h3);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary btn-sm';
    addBtn.textContent = t('show.addBlock');
    addBtn.addEventListener('click', function () {
      startDrawingBlock();
    });
    headerRow.appendChild(addBtn);
    blocksSection.appendChild(headerRow);

    const blocks = territory.blocks || [];

    if (blocks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = t('show.noBlocks');
      blocksSection.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'history-list';

      blocks.forEach(function (block, index) {
        const item = document.createElement('div');
        item.className = 'history-item';

        const info = document.createElement('div');
        info.className = 'history-info';

        const numberRow = document.createElement('div');
        numberRow.className = 'history-person';
        const colorDot = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + BLOCK_COLORS[index % BLOCK_COLORS.length] + ';margin-right:0.5rem;"></span>';
        numberRow.innerHTML = colorDot + escapeHtml(t('show.blocks')) + ' ' + escapeHtml(block.number);
        info.appendChild(numberRow);

        item.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'history-actions';
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger btn-sm';
        delBtn.textContent = t('show.deleteBlock');
        delBtn.addEventListener('click', function () {
          if (confirm(t('show.confirmDeleteBlock'))) {
            store.deleteBlock(territory.id, block.id);
            territory = store.getById(params.id);
            drawBlocksOnMap();
            rerenderBlocks();
          }
        });
        actions.appendChild(delBtn);
        item.appendChild(actions);
        list.appendChild(item);
      });

      blocksSection.appendChild(list);
    }
  }

  function startDrawingBlock() {
    if (!currentMap) return;

    // Add draw control temporarily
    const drawnItems = new L.FeatureGroup().addTo(currentMap);

    drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          shapeOptions: { color: '#F59E0B', weight: 2, fillOpacity: 0.2, dashArray: '5 5' },
          allowIntersection: false,
          showArea: false
        },
        marker: false, circle: false, rectangle: false, polyline: false, circlemarker: false
      },
      edit: false
    }).addTo(currentMap);

    // Show hint
    const hint = document.createElement('div');
    hint.className = 'flash flash-notice';
    hint.style.marginBottom = '1rem';
    hint.textContent = t('show.drawBlockHint');
    blocksSection.insertBefore(hint, blocksSection.firstChild.nextSibling);

    currentMap.on(L.Draw.Event.CREATED, function onCreated(e) {
      const latlngs = e.layer.getLatLngs()[0];
      const polygon = latlngs.map(function (ll) { return [ll.lng, ll.lat]; });

      const number = prompt(t('show.blockNumber'));
      if (number && number.trim()) {
        store.addBlock(territory.id, { number: number.trim(), polygon: polygon });
        territory = store.getById(params.id);
        drawBlocksOnMap();
        rerenderBlocks();
      }

      // Cleanup
      currentMap.removeControl(drawControl);
      currentMap.removeLayer(drawnItems);
      currentMap.off(L.Draw.Event.CREATED, onCreated);
      drawControl = null;
      if (hint.parentNode) hint.remove();
    });
  }

  // --- Assignment banner (F4) ---

  function rerenderAssignmentBanner() {
    assignmentBanner.innerHTML = '';
    const entries = store.getHistoryForTerritory(params.id);
    const activeAssignment = entries.find(function (e) {
      return (e.type === 'assignment' || !e.type) && e.status === 'active';
    });

    if (activeAssignment) {
      assignmentBanner.className = 'assignment-banner active';
      assignmentBanner.innerHTML =
        '<div class="assignment-info">' +
          '<strong>' + escapeHtml(t('show.assignedTo', { person: activeAssignment.person })) + '</strong> ' +
          '<span>' + escapeHtml(t('show.assignedSince', { date: activeAssignment.startDate })) + '</span>' +
        '</div>' +
        '<div class="assignment-actions"></div>';

      const actionsDiv = assignmentBanner.querySelector('.assignment-actions');

      const completeBtn = document.createElement('button');
      completeBtn.className = 'btn btn-primary btn-sm';
      completeBtn.textContent = t('show.markCompleted');
      completeBtn.addEventListener('click', function () {
        store.updateHistoryEntry(activeAssignment.id, {
          status: 'completed',
          endDate: new Date().toISOString().split('T')[0]
        });
        rerenderAssignmentBanner();
        rerenderHistory();
      });

      const returnBtn = document.createElement('button');
      returnBtn.className = 'btn btn-secondary btn-sm';
      returnBtn.textContent = t('show.markReturned');
      returnBtn.addEventListener('click', function () {
        store.updateHistoryEntry(activeAssignment.id, {
          status: 'returned',
          endDate: new Date().toISOString().split('T')[0]
        });
        rerenderAssignmentBanner();
        rerenderHistory();
      });

      actionsDiv.appendChild(completeBtn);
      actionsDiv.appendChild(returnBtn);
    } else {
      assignmentBanner.className = 'assignment-banner';
      const assignBtn = document.createElement('button');
      assignBtn.className = 'btn btn-primary btn-sm';
      assignBtn.textContent = t('show.assignTerritory');
      assignBtn.addEventListener('click', function () {
        const person = prompt(t('show.assignPerson'));
        if (person && person.trim()) {
          store.addHistoryEntry({
            territoryId: params.id,
            person: person.trim(),
            startDate: new Date().toISOString().split('T')[0],
            endDate: null,
            notes: '',
            type: 'assignment',
            status: 'active'
          });
          rerenderAssignmentBanner();
          rerenderHistory();
        }
      });
      assignmentBanner.appendChild(assignBtn);
    }
  }

  // --- History ---

  function rerenderHistory() {
    historySection.innerHTML = '';

    const headerRow = document.createElement('div');
    headerRow.className = 'history-header';

    const h3 = document.createElement('h3');
    h3.textContent = t('show.history');
    headerRow.appendChild(h3);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary btn-sm';
    addBtn.textContent = t('show.addHistory');
    addBtn.addEventListener('click', function () {
      showHistoryForm(null);
    });
    headerRow.appendChild(addBtn);
    historySection.appendChild(headerRow);

    const entries = store.getHistoryForTerritory(params.id);

    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = t('show.noHistory');
      historySection.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'history-list';

      entries.forEach(function (entry) {
        const item = document.createElement('div');
        item.className = 'history-item';

        const info = document.createElement('div');
        info.className = 'history-info';

        const personRow = document.createElement('div');
        personRow.className = 'history-person';
        personRow.textContent = entry.person;

        // Type + status badges
        if (entry.type || entry.status) {
          const typeLabel = entry.type === 'preaching' ? t('show.typePreaching') : t('show.typeAssignment');
          const statusLabel = entry.status === 'completed' ? t('show.statusCompleted')
            : entry.status === 'returned' ? t('show.statusReturned')
            : t('show.statusActive');
          const statusClass = entry.status === 'completed' ? 'status-completed'
            : entry.status === 'returned' ? 'status-returned'
            : 'status-active';

          personRow.innerHTML += ' <span class="type-badge">' + escapeHtml(typeLabel) + '</span>' +
            ' <span class="status-badge ' + statusClass + '">' + escapeHtml(statusLabel) + '</span>';
        }

        info.appendChild(personRow);

        const dateRow = document.createElement('div');
        dateRow.className = 'history-dates';
        const startStr = entry.startDate || '?';
        const endStr = entry.endDate || t('show.historyInProgress');
        dateRow.textContent = startStr + ' → ' + endStr;
        info.appendChild(dateRow);

        if (entry.notes) {
          const notesRow = document.createElement('div');
          notesRow.className = 'history-notes';
          notesRow.textContent = entry.notes;
          info.appendChild(notesRow);
        }

        item.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'history-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary btn-sm';
        editBtn.textContent = t('show.historyEdit');
        editBtn.addEventListener('click', function () {
          showHistoryForm(entry);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger btn-sm';
        delBtn.textContent = t('show.historyDelete');
        delBtn.addEventListener('click', function () {
          if (confirm(t('show.confirmDeleteHistory'))) {
            store.deleteHistoryEntry(entry.id);
            rerenderHistory();
            rerenderAssignmentBanner();
          }
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        item.appendChild(actions);
        list.appendChild(item);
      });

      historySection.appendChild(list);
    }
  }

  function showHistoryForm(existingEntry) {
    const oldForm = historySection.querySelector('.history-form');
    if (oldForm) oldForm.remove();

    const form = document.createElement('div');
    form.className = 'history-form';

    const existingType = existingEntry ? (existingEntry.type || 'assignment') : 'assignment';
    const existingStatus = existingEntry ? (existingEntry.status || 'active') : 'active';

    form.innerHTML =
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('show.historyPerson')) + '</label>' +
        '<input type="text" class="history-input" data-field="person" value="' + (existingEntry ? escapeHtml(existingEntry.person) : '') + '" />' +
      '</div>' +
      '<div class="history-form-row">' +
        '<div class="form-group">' +
          '<label>' + escapeHtml(t('show.historyType')) + '</label>' +
          '<select class="history-input" data-field="type">' +
            '<option value="assignment"' + (existingType === 'assignment' ? ' selected' : '') + '>' + escapeHtml(t('show.typeAssignment')) + '</option>' +
            '<option value="preaching"' + (existingType === 'preaching' ? ' selected' : '') + '>' + escapeHtml(t('show.typePreaching')) + '</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>' + escapeHtml(t('show.historyStatus')) + '</label>' +
          '<select class="history-input" data-field="status">' +
            '<option value="active"' + (existingStatus === 'active' ? ' selected' : '') + '>' + escapeHtml(t('show.statusActive')) + '</option>' +
            '<option value="completed"' + (existingStatus === 'completed' ? ' selected' : '') + '>' + escapeHtml(t('show.statusCompleted')) + '</option>' +
            '<option value="returned"' + (existingStatus === 'returned' ? ' selected' : '') + '>' + escapeHtml(t('show.statusReturned')) + '</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="history-form-row">' +
        '<div class="form-group">' +
          '<label>' + escapeHtml(t('show.historyStartDate')) + '</label>' +
          '<input type="date" class="history-input" data-field="startDate" value="' + (existingEntry ? existingEntry.startDate || '' : '') + '" />' +
        '</div>' +
        '<div class="form-group">' +
          '<label>' + escapeHtml(t('show.historyEndDate')) + '</label>' +
          '<input type="date" class="history-input" data-field="endDate" value="' + (existingEntry && existingEntry.endDate ? existingEntry.endDate : '') + '" />' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('show.historyNotes')) + '</label>' +
        '<input type="text" class="history-input" data-field="notes" value="' + (existingEntry ? escapeHtml(existingEntry.notes || '') : '') + '" />' +
      '</div>';

    const btnRow = document.createElement('div');
    btnRow.className = 'history-form-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-sm';
    saveBtn.textContent = t('show.historySave');
    saveBtn.addEventListener('click', function () {
      const person = form.querySelector('[data-field="person"]').value.trim();
      const startDate = form.querySelector('[data-field="startDate"]').value;
      const endDate = form.querySelector('[data-field="endDate"]').value || null;
      const notes = form.querySelector('[data-field="notes"]').value.trim();
      const type = form.querySelector('[data-field="type"]').value;
      const status = form.querySelector('[data-field="status"]').value;

      if (!person || !startDate) return;

      if (existingEntry) {
        store.updateHistoryEntry(existingEntry.id, { person, startDate, endDate, notes, type, status });
      } else {
        store.addHistoryEntry({ territoryId: params.id, person, startDate, endDate, notes, type, status });
      }
      rerenderHistory();
      rerenderAssignmentBanner();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary btn-sm';
    cancelBtn.textContent = t('show.historyCancel');
    cancelBtn.addEventListener('click', function () {
      form.remove();
    });

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);

    const headerEl = historySection.querySelector('.history-header');
    if (headerEl && headerEl.nextSibling) {
      historySection.insertBefore(form, headerEl.nextSibling);
    } else {
      historySection.appendChild(form);
    }

    form.querySelector('[data-field="person"]').focus();
  }

  return function () {
    if (drawControl && currentMap) {
      currentMap.removeControl(drawControl);
    }
    if (mapCleanup) mapCleanup();
  };
}
