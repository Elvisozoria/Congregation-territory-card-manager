import { t } from '../i18n/i18n.js';
import { getStore } from '../store/index.js';
import { initPolygonDraw } from '../components/polygon-draw.js';
import { escapeHtml, escapeAttr } from '../utils/helpers.js';

export let isDirty = false;

export function render(container, params) {
  const store = getStore();
  const isEdit = params.id !== null;
  const territory = isEdit ? store.getById(params.id) : null;

  if (isEdit && !territory) {
    container.innerHTML = '<p>' + escapeHtml(t('alert.notFound')) + '</p><a href="#/" class="btn btn-secondary">' + escapeHtml(t('show.btnBack')) + '</a>';
    return null;
  }

  let cleanup = null;
  isDirty = false;

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

  form.innerHTML =
    '<div class="form-group">' +
      '<label for="field-number">' + escapeHtml(t('form.fieldNumber')) + '</label>' +
      '<input type="text" id="field-number" placeholder="1A" value="' + escapeAttr(territory ? territory.number : '') + '" />' +
    '</div>' +
    '<div class="form-group">' +
      '<label for="field-name">' + escapeHtml(t('form.fieldName')) + '</label>' +
      '<input type="text" id="field-name" placeholder="Los Prados" value="' + escapeAttr(territory ? territory.name : '') + '" />' +
    '</div>' +
    '<div class="form-group">' +
      '<label for="field-group">' + escapeHtml(t('form.fieldGroup')) + '</label>' +
      '<input type="text" id="field-group" placeholder="Oeste" value="' + escapeAttr(territory ? territory.group_name : '') + '" />' +
    '</div>' +
    '<div class="form-group">' +
      '<label for="field-qr">' + escapeHtml(t('form.fieldQr')) + '</label>' +
      '<input type="url" id="field-qr" placeholder="https://..." value="' + escapeAttr(territory ? territory.qr_url : '') + '" />' +
    '</div>' +
    '<div class="form-group">' +
      '<label for="field-notes">' + escapeHtml(t('form.fieldNotes')) + '</label>' +
      '<textarea id="field-notes" rows="3" placeholder="' + escapeAttr(t('form.fieldNotesPlaceholder')) + '">' + escapeHtml(territory ? territory.notes || '' : '') + '</textarea>' +
    '</div>' +
    '<div class="form-instruction">' + t('form.drawInstruction') + '</div>';

  form.addEventListener('input', function () { isDirty = true; });

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
    deleteBtn.addEventListener('click', function () {
      if (confirm(t('form.confirmDelete', { name: territory.number + ' - ' + territory.name }))) {
        isDirty = false;
        store.deleteTerritory(territory.id);
        window.location.hash = '#/';
      }
    });
    deleteSection.appendChild(deleteBtn);
    form.appendChild(deleteSection);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const number = document.getElementById('field-number').value.trim();
    const name = document.getElementById('field-name').value.trim();
    const group_name = document.getElementById('field-group').value.trim();
    const qr_url = document.getElementById('field-qr').value.trim();
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

    if (qr_url && !/^https?:\/\//i.test(qr_url)) {
      errors.push(t('form.errorQrFormat'));
    }

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

    const attrs = { number, name, group_name, qr_url, notes, polygon };

    isDirty = false;
    if (isEdit) {
      store.updateTerritory(territory.id, attrs);
      window.location.hash = '#/territories/' + territory.id;
    } else {
      const result = store.createTerritory(attrs);
      window.location.hash = '#/territories/' + result.id;
    }
  });

  formContainer.appendChild(form);
  container.appendChild(formContainer);

  const existingPolygon = territory ? territory.polygon : [];
  cleanup = initPolygonDraw(mapDiv, hiddenInput, existingPolygon);

  return function () {
    clearInterval(polygonObserver);
    if (cleanup) cleanup();
  };
}
