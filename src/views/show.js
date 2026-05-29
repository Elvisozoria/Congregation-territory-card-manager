import L from 'leaflet';
import { t } from '../i18n/i18n.js';
import { getStore, getUserProfile } from '../store/index.js';
import { renderSingleMap } from '../components/map.js';
import { escapeHtml } from '../utils/helpers.js';
import { buildPublicTerritoryUrl } from '../utils/public-id.js';
import {
  canEditTerritory,
  canDeleteTerritory,
  canEditLandmarks,
  canEditBlocks,
  canAssignTerritory,
  canCompleteAssignment,
  canEditHistoryEntry,
  canDeleteHistoryEntry,
  canViewTerritory,
  canViewFullHistory
} from '../auth/permissions.js';

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
}

async function shareTerritoryUrl(store, territoryId) {
  let territory = store.getById(territoryId);
  if (!territory) return;
  let pubId = territory.publicId;
  if (!pubId && store.ensureTerritoryPublicId) {
    try {
      pubId = await store.ensureTerritoryPublicId(territoryId);
      territory = store.getById(territoryId);
    } catch (e) {
      console.error('ensureTerritoryPublicId failed', e);
    }
  }
  const congPubId = store.getCongregationPublicId ? store.getCongregationPublicId() : null;
  if (!pubId || !congPubId) {
    alert(t('share.copyFailed'));
    return;
  }
  const url = buildPublicTerritoryUrl(congPubId, pubId);
  const ok = await copyToClipboard(url);
  if (ok) {
    alert(t('share.copied') + '\n\n' + url);
  } else {
    prompt(t('share.copyFailed'), url);
  }
}

const LANDMARK_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
const BLOCK_COLORS = ['#F97316', '#06B6D4', '#84CC16', '#E879F9', '#FBBF24'];

export let isDirty = false;

export function render(container, params) {
  const store = getStore();
  const profile = getUserProfile();
  let territory = store.getById(params.id);
  if (!territory) {
    container.innerHTML = '<p>' + escapeHtml(t('alert.notFound')) + '</p><a href="#/" class="btn btn-secondary">' + escapeHtml(t('show.btnBack')) + '</a>';
    return null;
  }

  // Permission gate
  const activeAssignment = store.getActiveAssignment ? store.getActiveAssignment(params.id) : null;
  if (!canViewTerritory(profile, territory, activeAssignment)) {
    container.innerHTML = '<p style="padding:2rem;">' + escapeHtml(t('auth.noTerritoryAccess')) + '</p><a href="#/" class="btn btn-secondary" style="margin-left:2rem;">' + escapeHtml(t('show.btnBack')) + '</a>';
    return null;
  }

  const allowEditTerr = canEditTerritory(profile);
  const allowDeleteTerr = canDeleteTerritory(profile);
  const allowEditLm = canEditLandmarks(profile);
  const allowEditBl = canEditBlocks(profile);
  const allowAssign = canAssignTerritory(profile);
  const allowFullHistory = canViewFullHistory(profile);

  let mapCleanup = null;
  let currentMap = null;
  let landmarksSection = null;
  let landmarkMarkers = [];
  let blockLayers = [];
  let pendingLatlng = null;
  let landmarksExpanded = false;
  let blocksExpanded = false;

  // Header
  const header = document.createElement('div');
  header.className = 'header-row';
  let headerActions = '<a href="#/territories/' + territory.id + '/card" class="btn btn-primary">' + escapeHtml(t('show.btnCard')) + '</a> ';
  // Botón compartir solo en modo online (público requiere Firestore)
  if (profile && profile.congregationId) {
    headerActions += '<button class="btn btn-secondary share-btn">' + escapeHtml(t('share.button')) + '</button> ';
  }
  if (allowEditTerr) {
    headerActions += '<a href="#/territories/' + territory.id + '/edit" class="btn btn-secondary">' + escapeHtml(t('show.btnEdit')) + '</a> ';
  }
  headerActions += '<a href="#/" class="btn btn-secondary">' + escapeHtml(t('show.btnBack')) + '</a>';
  header.innerHTML = '<h1>' + escapeHtml(territory.number) + ' - ' + escapeHtml(territory.name) + '</h1>' +
    '<div>' + headerActions + '</div>';

  const shareBtnEl = header.querySelector('.share-btn');
  if (shareBtnEl) {
    shareBtnEl.addEventListener('click', function () {
      shareTerritoryUrl(store, params.id);
    });
  }
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

  let landmarkPlacementMode = false;
  let landmarkHintEl = null;

  mapCleanup = renderSingleMap(mapDiv, territory, function (latlng) {
    if (landmarkPlacementMode) {
      pendingLatlng = latlng;
      stopPlacingLandmark();
      showLandmarkForm();
    }
  }, function (map) {
    currentMap = map;
    drawBlocksOnMap();
    drawGlobalLandmarksOnMap();
  });

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

  // Delete territory link (solo admin)
  if (allowDeleteTerr) {
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
  }

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
    blocks.forEach(function (block) {
      if (!block.lat || !block.lng) return;
      const label = L.divIcon({
        className: '',
        html: '<span class="block-label">' + escapeHtml(block.number) + '</span>',
        iconSize: null
      });
      const labelMarker = L.marker([block.lat, block.lng], { icon: label, interactive: false }).addTo(currentMap);
      blockLayers.push(labelMarker);
    });
  }

  function clearBlockLayers() {
    blockLayers.forEach(function (l) { if (currentMap) currentMap.removeLayer(l); });
    blockLayers = [];
  }

  // --- Inline landmark form (F2 + F3) ---
  // existingLm: { id, name, description, lat, lng, color } or null for new
  // existingIsGlobal: boolean — current scope of an existing landmark

  function showLandmarkForm(existingLm, existingIsGlobal) {
    landmarkFormContainer.style.display = 'block';
    landmarkFormContainer.innerHTML = '';

    const isEdit = !!existingLm;
    const initialScope = isEdit ? (existingIsGlobal ? 'global' : 'local') : 'local';

    const form = document.createElement('div');
    form.className = 'landmark-form';
    form.innerHTML =
      '<h4>' + escapeHtml(isEdit ? t('show.editLandmarkTitle') : t('show.addLandmarkTitle')) + '</h4>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('show.addLandmarkName')) + '</label>' +
        '<input type="text" class="history-input" data-field="lm-name" value="' + (isEdit ? escapeHtml(existingLm.name) : '') + '" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('show.addLandmarkDesc')) + '</label>' +
        '<input type="text" class="history-input" data-field="lm-desc" value="' + (isEdit ? escapeHtml(existingLm.description || '') : '') + '" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('show.scopeLocal')) + '</label>' +
        '<div class="scope-toggle">' +
          '<button class="scope-btn' + (initialScope === 'local' ? ' active' : '') + '" data-scope="local">' + escapeHtml(t('show.scopeLocal')) + '</button>' +
          '<button class="scope-btn' + (initialScope === 'global' ? ' active' : '') + '" data-scope="global">' + escapeHtml(t('show.scopeGlobal')) + '</button>' +
        '</div>' +
      '</div>';

    let selectedScope = initialScope;
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
      if (!name) return;

      if (isEdit) {
        const scopeChanged = (existingIsGlobal && selectedScope === 'local') || (!existingIsGlobal && selectedScope === 'global');
        const latlng = { lat: existingLm.lat, lng: existingLm.lng };

        if (scopeChanged) {
          // Delete from old scope, create in new scope
          if (existingIsGlobal) {
            store.deleteGlobalLandmark(existingLm.id);
            const color = LANDMARK_COLORS[(territory.landmarks || []).length % LANDMARK_COLORS.length];
            store.addLandmark(territory.id, { name, description, lat: latlng.lat, lng: latlng.lng, color: color });
          } else {
            store.deleteLandmark(territory.id, existingLm.id);
            store.addGlobalLandmark({ name, description, lat: latlng.lat, lng: latlng.lng, color: '#9CA3AF' });
          }
        } else {
          // Same scope — just update
          if (existingIsGlobal) {
            store.updateGlobalLandmark(existingLm.id, { name, description });
          } else {
            store.updateLandmark(territory.id, existingLm.id, { name, description });
          }
        }
      } else {
        // New landmark
        if (!pendingLatlng) return;
        const color = LANDMARK_COLORS[(territory.landmarks || []).length % LANDMARK_COLORS.length];

        if (selectedScope === 'global') {
          store.addGlobalLandmark({ name, description, lat: pendingLatlng.lat, lng: pendingLatlng.lng, color: '#9CA3AF' });
        } else {
          store.addLandmark(territory.id, { name, description, lat: pendingLatlng.lat, lng: pendingLatlng.lng, color: color });
        }
        pendingLatlng = null;
      }

      landmarkFormContainer.style.display = 'none';
      refreshMapMarkers();
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

    const headerRow = document.createElement('div');
    headerRow.className = 'history-header';

    const localLandmarks = territory.landmarks || [];
    const globalLandmarks = store.getGlobalLandmarks ? store.getGlobalLandmarks() : [];
    const count = localLandmarks.length + globalLandmarks.length;

    const h3 = document.createElement('h3');
    h3.style.cursor = 'pointer';
    h3.style.userSelect = 'none';
    h3.textContent = (landmarksExpanded ? '▾ ' : '▸ ') + t('show.landmarks') + (count > 0 ? ' (' + count + ')' : '');
    h3.addEventListener('click', function () {
      landmarksExpanded = !landmarksExpanded;
      rerenderLandmarks();
    });
    headerRow.appendChild(h3);

    if (allowEditLm) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-secondary btn-sm';
      addBtn.textContent = t('show.addLandmark');
      addBtn.addEventListener('click', function () {
        startPlacingLandmark();
      });
      headerRow.appendChild(addBtn);
    }
    landmarksSection.appendChild(headerRow);

    if (!landmarksExpanded) return;

    if (count === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = t('show.noLandmarks');
      landmarksSection.appendChild(empty);
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'landmarks-list';

    localLandmarks.forEach(function (lm) {
      ul.appendChild(buildLandmarkItem(lm, false));
    });

    globalLandmarks.forEach(function (lm) {
      ul.appendChild(buildLandmarkItem(lm, true));
    });

    landmarksSection.appendChild(ul);
  }

  function startPlacingLandmark() {
    if (!currentMap || landmarkPlacementMode) return;
    stopPlacingBlock();
    landmarkPlacementMode = true;

    landmarkHintEl = document.createElement('div');
    landmarkHintEl.className = 'flash flash-notice';
    landmarkHintEl.style.marginBottom = '1rem';
    landmarkHintEl.textContent = t('show.placeLandmarkHint');

    const cancelLink = document.createElement('button');
    cancelLink.className = 'btn btn-secondary btn-sm';
    cancelLink.style.marginLeft = '0.5rem';
    cancelLink.textContent = t('show.addLandmarkCancel');
    cancelLink.addEventListener('click', stopPlacingLandmark);
    landmarkHintEl.appendChild(cancelLink);

    landmarksSection.insertBefore(landmarkHintEl, landmarksSection.firstChild.nextSibling);

    currentMap.getContainer().style.cursor = 'crosshair';
  }

  function stopPlacingLandmark() {
    landmarkPlacementMode = false;
    if (currentMap) {
      currentMap.getContainer().style.cursor = '';
    }
    if (landmarkHintEl && landmarkHintEl.parentNode) landmarkHintEl.remove();
    landmarkHintEl = null;
  }

  function refreshMapMarkers() {
    clearMapMarkers();
    territory = store.getById(params.id);
    (territory.landmarks || []).forEach(function (l) { addMarkerToMap(l, false); });
    drawGlobalLandmarksOnMap();
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

    li.appendChild(dot);
    li.appendChild(infoDiv);

    if (allowEditLm) {
      const actionsSpan = document.createElement('span');
      actionsSpan.className = 'landmark-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = t('show.editLandmark');
      editBtn.addEventListener('click', function () {
        showLandmarkForm(lm, isGlobal);
      });
      actionsSpan.appendChild(editBtn);

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
          refreshMapMarkers();
          rerenderLandmarks();
        }
      });
      actionsSpan.appendChild(deleteBtn);
      li.appendChild(actionsSpan);
    }

    return li;
  }

  // --- Blocks (manzanas) F1 ---

  function rerenderBlocks() {
    territory = store.getById(params.id);
    blocksSection.innerHTML = '';

    const headerRow = document.createElement('div');
    headerRow.className = 'history-header';

    const blocks = territory.blocks || [];

    const h3 = document.createElement('h3');
    h3.style.cursor = 'pointer';
    h3.style.userSelect = 'none';
    h3.textContent = (blocksExpanded ? '▾ ' : '▸ ') + t('show.blocks') + (blocks.length > 0 ? ' (' + blocks.length + ')' : '');
    h3.addEventListener('click', function () {
      blocksExpanded = !blocksExpanded;
      rerenderBlocks();
    });
    headerRow.appendChild(h3);

    if (allowEditBl) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-secondary btn-sm';
      addBtn.textContent = t('show.addBlock');
      addBtn.addEventListener('click', function () {
        startPlacingBlock();
      });
      headerRow.appendChild(addBtn);
    }
    blocksSection.appendChild(headerRow);

    if (!blocksExpanded) return;

    if (blocks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = t('show.noBlocks');
      blocksSection.appendChild(empty);
    } else {
      const ul = document.createElement('ul');
      ul.className = 'landmarks-list';

      blocks.forEach(function (block, index) {
        const li = document.createElement('li');
        li.className = 'landmark-item';

        const dot = document.createElement('span');
        dot.className = 'landmark-dot';
        dot.style.background = BLOCK_COLORS[index % BLOCK_COLORS.length];

        const infoDiv = document.createElement('div');
        infoDiv.className = 'landmark-info';

        const nameRow = document.createElement('span');
        nameRow.className = 'landmark-name';
        nameRow.textContent = t('show.blocks') + ' ' + block.number;
        infoDiv.appendChild(nameRow);

        li.appendChild(dot);
        li.appendChild(infoDiv);

        if (allowEditBl) {
          const actionsSpan = document.createElement('span');
          actionsSpan.className = 'landmark-actions';

          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-secondary btn-sm';
          editBtn.textContent = t('show.editBlock');
          editBtn.addEventListener('click', function () {
            const newNumber = prompt(t('show.blockName'), block.number);
            if (newNumber !== null && newNumber.trim()) {
              store.updateBlock(territory.id, block.id, { number: newNumber.trim() });
              territory = store.getById(params.id);
              drawBlocksOnMap();
              rerenderBlocks();
            }
          });
          actionsSpan.appendChild(editBtn);

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
          actionsSpan.appendChild(delBtn);

          li.appendChild(actionsSpan);
        }

        ul.appendChild(li);
      });

      blocksSection.appendChild(ul);
    }
  }

  let blockPlacementMode = false;
  let blockHintEl = null;

  function startPlacingBlock() {
    if (!currentMap || blockPlacementMode) return;
    stopPlacingLandmark();
    blockPlacementMode = true;

    // Show hint
    blockHintEl = document.createElement('div');
    blockHintEl.className = 'flash flash-notice';
    blockHintEl.style.marginBottom = '1rem';
    blockHintEl.textContent = t('show.placeBlockHint');

    const cancelLink = document.createElement('button');
    cancelLink.className = 'btn btn-secondary btn-sm';
    cancelLink.style.marginLeft = '0.5rem';
    cancelLink.textContent = t('show.addLandmarkCancel');
    cancelLink.addEventListener('click', stopPlacingBlock);
    blockHintEl.appendChild(cancelLink);

    blocksSection.insertBefore(blockHintEl, blocksSection.firstChild.nextSibling);

    currentMap.getContainer().style.cursor = 'crosshair';
    currentMap.on('click', onBlockPlacement);
  }

  function onBlockPlacement(e) {
    const number = prompt(t('show.blockNumber'));
    if (number && number.trim()) {
      store.addBlock(territory.id, { number: number.trim(), lat: e.latlng.lat, lng: e.latlng.lng });
      territory = store.getById(params.id);
      drawBlocksOnMap();
      rerenderBlocks();
    }
    stopPlacingBlock();
  }

  function stopPlacingBlock() {
    blockPlacementMode = false;
    if (currentMap) {
      currentMap.off('click', onBlockPlacement);
      currentMap.getContainer().style.cursor = '';
    }
    if (blockHintEl && blockHintEl.parentNode) blockHintEl.remove();
    blockHintEl = null;
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

      if (canCompleteAssignment(profile, activeAssignment)) {
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
      }
    } else if (allowAssign) {
      assignmentBanner.className = 'assignment-banner';
      const assignBtn = document.createElement('button');
      assignBtn.className = 'btn btn-primary btn-sm';
      assignBtn.textContent = t('show.assignTerritory');
      assignBtn.addEventListener('click', function () {
        if (profile) {
          openAssignDialog();
        } else {
          // Offline mode: prompt simple
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
        }
      });
      assignmentBanner.appendChild(assignBtn);
    } else {
      assignmentBanner.className = 'assignment-banner';
      assignmentBanner.style.display = 'none';
    }
  }

  // Diálogo de asignación con dropdown de miembros (admin)
  async function openAssignDialog() {
    const existing = assignmentBanner.querySelector('.assign-form');
    if (existing) { existing.remove(); return; }

    const form = document.createElement('div');
    form.className = 'assign-form';
    form.style.cssText = 'margin-top:0.5rem;padding:0.75rem;background:#F9FAFB;border-radius:4px;';
    form.innerHTML = '<p style="font-size:0.875rem;">' + escapeHtml(t('admin.loading')) + '</p>';
    assignmentBanner.appendChild(form);

    let members = [];
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../firebase/config.js');
      const q = query(collection(db, 'users'), where('congregationId', '==', profile.congregationId));
      const snap = await getDocs(q);
      members = snap.docs.map(function (d) { return { uid: d.id, ...d.data() }; })
        .filter(function (m) { return m.role === 'conductor' || m.role === 'publisher' || m.role === 'admin' || m.role === 'member'; });
    } catch (err) {
      console.error('Failed to load members for assignment:', err);
    }

    if (members.length === 0) {
      form.innerHTML = '<p style="font-size:0.875rem;">' + escapeHtml(t('show.assignNoMembers')) + '</p>';
      return;
    }

    form.innerHTML =
      '<div class="form-group">' +
        '<label>' + escapeHtml(t('show.assignSelectPerson')) + '</label>' +
        '<select class="history-input" data-field="assignee"></select>' +
      '</div>';

    const select = form.querySelector('[data-field="assignee"]');
    members.forEach(function (m) {
      const opt = document.createElement('option');
      opt.value = m.uid;
      opt.textContent = (m.displayName || m.email) + ' (' + (m.role || '') + ')';
      opt.dataset.name = m.displayName || m.email;
      select.appendChild(opt);
    });

    const btnRow = document.createElement('div');
    btnRow.className = 'history-form-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-sm';
    saveBtn.textContent = t('show.assignSubmit');
    saveBtn.addEventListener('click', function () {
      const opt = select.options[select.selectedIndex];
      const uid = opt.value;
      const name = opt.dataset.name;
      store.addHistoryEntry({
        territoryId: params.id,
        person: name,
        assignedToUid: uid,
        startDate: new Date().toISOString().split('T')[0],
        endDate: null,
        notes: '',
        type: 'assignment',
        status: 'active'
      });
      form.remove();
      rerenderAssignmentBanner();
      rerenderHistory();
    });
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary btn-sm';
    cancelBtn.textContent = t('show.assignCancel');
    cancelBtn.addEventListener('click', function () { form.remove(); });
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    form.appendChild(btnRow);
  }

  // --- History ---

  let historyFilter = 'all'; // all|active|completed|returned

  function formatDuration(startISO, endISO) {
    if (!startISO) return '';
    const start = new Date(startISO);
    const end = endISO ? new Date(endISO) : new Date();
    const ms = end - start;
    if (isNaN(ms) || ms < 0) return '';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (days < 30) {
      return days === 1 ? t('show.historyDurationDay') : t('show.historyDurationDays', { n: days });
    }
    const months = Math.floor(days / 30);
    if (months < 12) {
      return months === 1 ? t('show.historyDurationMonth') : t('show.historyDurationMonths', { n: months });
    }
    const years = Math.floor(months / 12);
    return years === 1 ? t('show.historyDurationYear') : t('show.historyDurationYears', { n: years });
  }

  function rerenderHistory() {
    historySection.innerHTML = '';

    const headerRow = document.createElement('div');
    headerRow.className = 'history-header';

    const h3 = document.createElement('h3');
    h3.textContent = t('show.history');
    headerRow.appendChild(h3);

    if (allowAssign) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-secondary btn-sm';
      addBtn.textContent = t('show.addHistory');
      addBtn.addEventListener('click', function () {
        showHistoryForm(null);
      });
      headerRow.appendChild(addBtn);
    }
    historySection.appendChild(headerRow);

    let entries = store.getHistoryForTerritory(params.id);
    // Publisher solo ve sus propias entradas
    if (!allowFullHistory) {
      entries = entries.filter(function (e) { return e.assignedToUid === profile.uid; });
    }

    // Filtros (solo si hay entradas)
    if (entries.length > 0) {
      const filterRow = document.createElement('div');
      filterRow.className = 'history-filters';
      filterRow.style.cssText = 'display:flex;gap:0.25rem;margin-bottom:0.75rem;flex-wrap:wrap;';

      const filters = [
        { key: 'all', label: t('show.historyFilterAll') },
        { key: 'active', label: t('show.historyFilterActive') },
        { key: 'completed', label: t('show.historyFilterCompleted') },
        { key: 'returned', label: t('show.historyFilterReturned') }
      ];

      filters.forEach(function (f) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm' + (historyFilter === f.key ? ' active' : '');
        btn.textContent = f.label;
        if (historyFilter === f.key) {
          btn.style.background = 'var(--primary, #2563EB)';
          btn.style.color = 'white';
        }
        btn.addEventListener('click', function () {
          historyFilter = f.key;
          rerenderHistory();
        });
        filterRow.appendChild(btn);
      });

      historySection.appendChild(filterRow);

      if (historyFilter !== 'all') {
        entries = entries.filter(function (e) {
          const status = e.status || 'active';
          return status === historyFilter;
        });
      }
    }

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
        const duration = formatDuration(entry.startDate, entry.endDate);
        dateRow.textContent = startStr + ' → ' + endStr + (duration ? '  ·  ' + duration : '');
        info.appendChild(dateRow);

        if (entry.notes) {
          const notesRow = document.createElement('div');
          notesRow.className = 'history-notes';
          const isLong = entry.notes.length > 140 || entry.notes.split('\n').length > 2;
          if (isLong) {
            const span = document.createElement('span');
            span.className = 'history-notes-text';
            span.textContent = entry.notes.slice(0, 140) + '…';
            const toggle = document.createElement('button');
            toggle.className = 'history-notes-toggle';
            toggle.style.cssText = 'background:none;border:none;color:var(--primary,#2563EB);cursor:pointer;font-size:0.75rem;padding:0 0.25rem;';
            toggle.textContent = ' ' + t('show.historyShowMore');
            let expanded = false;
            toggle.addEventListener('click', function () {
              expanded = !expanded;
              if (expanded) {
                span.textContent = entry.notes;
                toggle.textContent = ' ' + t('show.historyShowLess');
              } else {
                span.textContent = entry.notes.slice(0, 140) + '…';
                toggle.textContent = ' ' + t('show.historyShowMore');
              }
            });
            notesRow.appendChild(span);
            notesRow.appendChild(toggle);
          } else {
            notesRow.textContent = entry.notes;
          }
          info.appendChild(notesRow);
        }

        item.appendChild(info);

        const canEditEntry = canEditHistoryEntry(profile, entry);
        const canDelEntry = canDeleteHistoryEntry(profile, entry);

        if (canEditEntry || canDelEntry) {
          const actions = document.createElement('div');
          actions.className = 'history-actions';

          if (canEditEntry) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-secondary btn-sm';
            editBtn.textContent = t('show.historyEdit');
            editBtn.addEventListener('click', function () {
              showHistoryForm(entry);
            });
            actions.appendChild(editBtn);
          }

          if (canDelEntry) {
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
            actions.appendChild(delBtn);
          }

          item.appendChild(actions);
        }

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
    stopPlacingBlock();
    stopPlacingLandmark();
    if (mapCleanup) mapCleanup();
  };
}
