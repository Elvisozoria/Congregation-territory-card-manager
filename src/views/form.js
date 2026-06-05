import { t } from '../i18n/i18n.js';
import { getStore, getUserProfile } from '../store/index.js';
import { initPolygonDraw } from '../components/polygon-draw.js';
import { escapeHtml, escapeAttr } from '../utils/helpers.js';
import { canCreateTerritory, canEditTerritory } from '../auth/permissions.js';

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
  formContainer.className = 'form-container';

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
  const valGroup = src ? src.group_name || '' : '';
  const valShowQr = src ? !!src.showQr : false;
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
      '<label for="field-group">' + escapeHtml(t('form.fieldGroup')) + '</label>' +
      '<input type="text" id="field-group" placeholder="Oeste" value="' + escapeAttr(valGroup) + '" />' +
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
    '<div class="form-group">' +
      '<label for="field-notes">' + escapeHtml(t('form.fieldNotes')) + '</label>' +
      '<textarea id="field-notes" rows="3" placeholder="' + escapeAttr(t('form.fieldNotesPlaceholder')) + '">' + escapeHtml(valNotes) + '</textarea>' +
    '</div>' +
    '<div class="form-instruction">' + t('form.drawInstruction') + '</div>';

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
        group_name: document.getElementById('field-group').value,
        showQr: document.getElementById('field-qr').checked,
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

  form.appendChild(mapDiv);
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
    const group_name = document.getElementById('field-group').value.trim();
    const showQr = document.getElementById('field-qr').checked;
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

    const attrs = { number, name, group_name, showQr, notes, polygon };

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
