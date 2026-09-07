import { t } from '../i18n/i18n.js';
import { getStore, getUserProfile } from '../store/index.js';
import { initPolygonDraw } from '../components/polygon-draw.js';
import { escapeHtml, escapeAttr, parseHouses } from '../utils/helpers.js';
import { canCreateTerritory, canEditTerritory } from '../auth/permissions.js';
import { territoryTags, allTags, parseTagsInput, formatTagsInput } from '../utils/tags.js';

export let isDirty = false;

const DRAFT_PREFIX = 'territory-draft-';

function getDraftKey(id) {
  return DRAFT_PREFIX + (id || 'new');
}

function saveDraft(id, formData) {
  try { localStorage.setItem(getDraftKey(id), JSON.stringify(formData)); } catch (e) { /* ignore */ }
}

function loadDraft(id) {
  try {
    const saved = localStorage.getItem(getDraftKey(id));
    return saved ? JSON.parse(saved) : null;
  } catch (e) { return null; }
}

function clearDraft(id) {
  try { localStorage.removeItem(getDraftKey(id)); } catch (e) { /* ignore */ }
}

export function render(container, params) {
  const store = getStore();
  const profile = getUserProfile();
  const isEdit = params.id !== null;
  const territory = isEdit ? store.getById(params.id) : null;

  if (isEdit && !territory) {
    container.innerHTML = '<p>' + escapeHtml(t('alert.notFound')) + '</p><a href="#/" class="btn btn-secondary">' + escapeHtml(t('show.btnBack')) + '</a>';
    return null;
  }

  // Permission gate: solo admin puede crear/editar territorios
  const allowed = isEdit ? canEditTerritory(profile) : canCreateTerritory(profile);
  if (!allowed) {
    container.innerHTML = '<p style="padding:2rem;">' + escapeHtml(t('auth.noPermission')) + '</p><a href="#/" class="btn btn-secondary" style="margin-left:2rem;">' + escapeHtml(t('show.btnBack')) + '</a>';
    return null;
  }

  let cleanup = null;
  let draftTimer = null;
  isDirty = false;

  // Check for existing draft
  const draft = loadDraft(params.id);
  let useDraft = false;
  if (draft) {
    useDraft = confirm(t('form.draftFound'));
    if (!useDraft) clearDraft(params.id);
  }

  // Header
  const header = document.createElement('div');
  header.className = 'header-row';
  header.innerHTML = '<h1>' + escapeHtml(isEdit ? t('form.titleEdit') : t('form.titleNew')) + '</h1>' +
    '<a href="' + (isEdit ? '#/territories/' + territory.id : '#/') + '" class="btn btn-secondary">' + escapeHtml(t('form.cancel')) + '</a>';
  container.appendChild(header);

  // Form container
  const formContainer = document.createElement('div');
  formContainer.className = 'form-container form-split';

  // Error container
  const errorDiv = document.createElement('div');
  errorDiv.className = 'flash flash-alert';
  errorDiv.style.display = 'none';
  formContainer.appendChild(errorDiv);

  // Form fields
  const form = document.createElement('form');

  // Source values: draft takes priority if user accepted it
  const src = useDraft && draft ? draft : territory;
  const valNum = src ? src.number || '' : '';
  const valName = src ? src.name || '' : '';
  const valTags = src ? formatTagsInput(src.tags !== undefined ? src.tags : territoryTags(src)) : '';
  const valHouses = src && src.houses ? String(src.houses) : '';

  // Las sugerencias salen de las etiquetas ya en uso: no hay catálogo que
  // administrar, el datalist nativo hace el autocompletado.
  const tagSuggestions = allTags(store.getAll()).map(function (tag) {
    return '<option value="' + escapeAttr(tag) + '"></option>';
  }).join('');
  const valShowQr = src ? !!src.showQr : false;
  const valShowHouses = src ? !!src.showHouses : false;
  const valNotes = src ? src.notes || '' : '';

  form.innerHTML =
    '<div class="form-group">' +
      '<label for="field-number">' + escapeHtml(t('form.fieldNumber')) + '</label>' +
      '<input type="text" id="field-number" placeholder="1A" value="' + escapeAttr(valNum) + '" />' +
    '</div>' +
    '<div class="form-group">' +
      '<label for="field-name">' + escapeHtml(t('form.fieldName')) + '</label>' +
      '<input type="text" id="field-name" placeholder="Los Prados" value="' + escapeAttr(valName) + '" />' +
    '</div>' +
    '<div class="form-group">' +
      '<label for="field-tags">' + escapeHtml(t('form.fieldTags')) + '</label>' +
      '<input type="text" id="field-tags" list="tag-suggestions" placeholder="' + escapeAttr(t('form.tagsPlaceholder')) + '" value="' + escapeAttr(valTags) + '" />' +
      '<datalist id="tag-suggestions">' + tagSuggestions + '</datalist>' +
      '<small style="color:var(--text-secondary);">' + escapeHtml(t('form.tagsHint')) + '</small>' +
    '</div>' +
    '<div class="form-group">' +
      '<label for="field-houses">' + escapeHtml(t('form.fieldHouses')) + '</label>' +
      '<input type="number" id="field-houses" min="0" step="1" inputmode="numeric" placeholder="25" value="' + escapeAttr(valHouses) + '" />' +
      '<small style="color:var(--text-secondary);">' + escapeHtml(t('form.housesHint')) + '</small>' +
    '</div>' +
    '<div class="form-group toggle-group">' +
      '<label class="toggle-label">' +
        '<span>' + escapeHtml(t('form.fieldQr')) + '</span>' +
        '<label class="switch">' +
          '<input type="checkbox" id="field-qr"' + (valShowQr ? ' checked' : '') + ' />' +
          '<span class="slider"></span>' +
        '</label>' +
      '</label>' +
      '<p class="field-hint">' + escapeHtml(t('form.fieldQrHint')) + '</p>' +
    '</div>' +
    '<div class="form-group toggle-group">' +
      '<label class="toggle-label">' +
        '<span>' + escapeHtml(t('form.fieldShowHouses')) + '</span>' +
        '<label class="switch">' +
          '<input type="checkbox" id="field-show-houses"' + (valShowHouses ? ' checked' : '') + ' />' +
          '<span class="slider"></span>' +
        '</label>' +
      '</label>' +
      '<p class="field-hint">' + escapeHtml(t('form.fieldShowHousesHint')) + '</p>' +
    '</div>' +
    '<div class="form-group">' +
      '<label for="field-notes">' + escapeHtml(t('form.fieldNotes')) + '</label>' +
      '<textarea id="field-notes" rows="3" placeholder="' + escapeAttr(t('form.fieldNotesPlaceholder')) + '">' + escapeHtml(valNotes) + '</textarea>' +
    '</div>' +
    '';

  function onBeforeUnload(e) {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  }
  window.addEventListener('beforeunload', onBeforeUnload);

  form.addEventListener('input', function () {
    isDirty = true;
    // Debounced draft save
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      saveDraft(params.id, {
        number: document.getElementById('field-number').value,
        name: document.getElementById('field-name').value,
        tags: parseTagsInput(document.getElementById('field-tags').value),
        houses: document.getElementById('field-houses').value,
        showQr: document.getElementById('field-qr').checked,
        showHouses: document.getElementById('field-show-houses').checked,
        notes: document.getElementById('field-notes').value
      });
    }, 2000);
  });

  // Map container for polygon draw
  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';

  // Hidden input for polygon data
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.id = 'field-polygon';
  hiddenInput.value = territory ? JSON.stringify(territory.polygon) : '[]';

  const originalPolygon = hiddenInput.value;
  const polygonObserver = setInterval(function () {
    if (hiddenInput.value !== originalPolygon) {
      isDirty = true;
      clearInterval(polygonObserver);
    }
  }, 500);

  // El mapa va en su propia columna, no al final de una columna estrecha:
  // dibujar el contorno de un territorio necesita sitio.
  const mapPane = document.createElement('div');
  mapPane.className = 'form-map-pane';

  const mapHead = document.createElement('div');
  mapHead.className = 'form-map-head';
  mapHead.innerHTML = '<span>' + escapeHtml(t('form.mapTitle')) + '</span>';

  const expandBtn = document.createElement('button');
  expandBtn.type = 'button';
  expandBtn.className = 'btn btn-secondary btn-sm';
  expandBtn.textContent = t('form.mapExpand');
  expandBtn.addEventListener('click', function () {
    const on = mapPane.classList.toggle('fullscreen');
    expandBtn.textContent = on ? t('form.mapCollapse') : t('form.mapExpand');
    document.body.classList.toggle('map-fullscreen-open', on);
    window.setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
  });
  mapHead.appendChild(expandBtn);

  mapPane.appendChild(mapHead);
  mapPane.appendChild(mapDiv);
  form.appendChild(hiddenInput);

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.style.marginTop = '1rem';
  submitBtn.style.width = '100%';
  submitBtn.textContent = t('form.save');
  form.appendChild(submitBtn);

  // Delete link (edit mode only)
  if (isEdit) {
    const deleteSection = document.createElement('div');
    deleteSection.className = 'delete-section';
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-text-danger';
    deleteBtn.textContent = t('form.deleteTerritory');
    deleteBtn.addEventListener('click', async function () {
      if (confirm(t('form.confirmDelete', { name: territory.number + ' - ' + territory.name }))) {
        isDirty = false;
        await store.deleteTerritory(territory.id);
        window.location.hash = '#/';
      }
    });
    deleteSection.appendChild(deleteBtn);
    form.appendChild(deleteSection);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const number = document.getElementById('field-number').value.trim();
    const name = document.getElementById('field-name').value.trim();
    const tags = parseTagsInput(document.getElementById('field-tags').value);
    const houses = parseHouses(document.getElementById('field-houses').value);
    const showQr = document.getElementById('field-qr').checked;
    const showHouses = document.getElementById('field-show-houses').checked;
    const notes = document.getElementById('field-notes').value.trim();
    let polygon = [];

    try {
      polygon = JSON.parse(hiddenInput.value);
    } catch (err) {
      polygon = [];
    }

    const errors = [];
    if (!number) errors.push(t('form.errorNumber'));
    if (!name) errors.push(t('form.errorName'));

    const duplicate = store.getAll().find(function (existing) {
      return existing.number === number && (!isEdit || existing.id !== territory.id);
    });
    if (duplicate) errors.push(t('form.errorDuplicate', { number: number }));

    if (errors.length > 0) {
      errorDiv.innerHTML = '';
      errors.forEach(function (msg) {
        const p = document.createElement('p');
        p.textContent = msg;
        errorDiv.appendChild(p);
      });
      errorDiv.style.display = 'block';
      return;
    }

    const attrs = { number, name, tags, houses, showQr, showHouses, notes, polygon };

    isDirty = false;
    clearDraft(params.id);
    if (isEdit) {
      await store.updateTerritory(territory.id, attrs);
      window.location.hash = '#/territories/' + territory.id;
    } else {
      const result = await store.createTerritory(attrs);
      window.location.hash = '#/territories/' + result.id;
    }
  });

  formContainer.appendChild(form);
  formContainer.appendChild(mapPane);
  container.appendChild(formContainer);

  const existingPolygon = territory ? territory.polygon : [];
  cleanup = initPolygonDraw(mapDiv, hiddenInput, existingPolygon);

  return function () {
    clearInterval(polygonObserver);
    if (draftTimer) clearTimeout(draftTimer);
    window.removeEventListener('beforeunload', onBeforeUnload);
    if (cleanup) cleanup();
  };
}
