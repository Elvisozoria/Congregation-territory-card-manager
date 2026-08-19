import { t } from '../i18n/i18n.js';
import { getStore, getUserProfile } from '../store/index.js';
import { escapeHtml } from '../utils/helpers.js';
import { canViewPrintAll } from '../auth/permissions.js';

export let isDirty = false;

// Columnas de asignación del formulario S-13 impreso.
const SLOTS = 4;

// Año de servicio: 1 de septiembre – 31 de agosto.
export function serviceYear(date) {
  const y = date.getFullYear();
  return date.getMonth() >= 8 ? y + 1 : y;
}

// Convierte el historial de un territorio en una fila del S-13.
// `history` viene en orden descendente por startDate (como lo devuelve el store).
export function buildS13Row(history, slots) {
  const assignments = history.filter(function (e) {
    return (e.type || 'assignment') === 'assignment';
  });

  const lastCompleted = assignments
    .filter(function (e) { return e.endDate; })
    .map(function (e) { return e.endDate; })
    .sort()
    .pop() || '';

  // Las últimas `slots` asignaciones, en orden cronológico como en el formulario impreso.
  const recent = assignments.slice(0, slots).reverse();
  const cells = [];
  for (let i = 0; i < slots; i++) {
    const e = recent[i];
    cells.push({
      person: e ? (e.person || '') : '',
      startDate: e ? (e.startDate || '') : '',
      endDate: e && e.endDate ? e.endDate : ''
    });
  }

  return { lastCompleted: lastCompleted, cells: cells };
}

export function render(container) {
  const store = getStore();
  const profile = getUserProfile();

  if (!canViewPrintAll(profile)) {
    container.innerHTML = '<p style="padding:2rem;">' + escapeHtml(t('auth.noPermission')) + '</p>' +
      '<a href="#/" class="btn btn-secondary" style="margin-left:2rem;">' + escapeHtml(t('print.back')) + '</a>';
    return null;
  }

  const territories = store.getAll().slice().sort(function (a, b) {
    return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
  });

  document.body.classList.add('print-layout');

  // Controles (no se imprimen)
  const controls = document.createElement('div');
  controls.className = 'no-print';
  controls.style.cssText = 'padding:1.5rem;text-align:center;';
  controls.innerHTML = '<h2 style="font-size:1.25rem;">' + escapeHtml(t('s13.title')) + '</h2>' +
    '<p style="color:var(--text-secondary);font-size:0.875rem;">' + escapeHtml(t('s13.subtitle')) + '</p>';

  const btnRow = document.createElement('div');
  btnRow.style.marginTop = '0.5rem';

  const printBtn = document.createElement('a');
  printBtn.href = '#';
  printBtn.className = 'btn btn-primary';
  printBtn.textContent = t('s13.print');
  printBtn.addEventListener('click', function (e) {
    e.preventDefault();
    window.print();
  });

  const backBtn = document.createElement('a');
  backBtn.href = '#/';
  backBtn.className = 'btn btn-secondary';
  backBtn.textContent = t('print.back');

  btnRow.appendChild(printBtn);
  btnRow.appendChild(document.createTextNode(' '));
  btnRow.appendChild(backBtn);
  controls.appendChild(btnRow);
  container.appendChild(controls);

  // Hoja
  const sheet = document.createElement('div');
  sheet.className = 's13-sheet';

  const head = document.createElement('div');
  head.className = 's13-head';
  head.innerHTML = '<h3>' + escapeHtml(t('s13.formTitle')) + '</h3>' +
    '<p>' + escapeHtml(t('s13.serviceYear')) + ': <strong>' + serviceYear(new Date()) + '</strong></p>';
  sheet.appendChild(head);

  const table = document.createElement('table');
  table.className = 's13-table';

  let thead = '<thead><tr>' +
    '<th rowspan="2" class="s13-col-num">' + escapeHtml(t('s13.colNumber')) + '</th>' +
    '<th rowspan="2" class="s13-col-last">' + escapeHtml(t('s13.colLastCompleted')) + '</th>';
  for (let i = 0; i < SLOTS; i++) {
    thead += '<th colspan="3" class="s13-slot-head">' + escapeHtml(t('s13.colAssignedTo')) + '</th>';
  }
  thead += '</tr><tr>';
  for (let i = 0; i < SLOTS; i++) {
    thead += '<th class="s13-sub">' + escapeHtml(t('s13.colPerson')) + '</th>' +
      '<th class="s13-sub">' + escapeHtml(t('s13.colStart')) + '</th>' +
      '<th class="s13-sub">' + escapeHtml(t('s13.colEnd')) + '</th>';
  }
  thead += '</tr></thead>';
  table.innerHTML = thead + '<tbody></tbody>';

  const tbody = table.querySelector('tbody');

  territories.forEach(function (territory) {
    const history = store.getHistoryForTerritory ? store.getHistoryForTerritory(territory.id) : [];
    const data = buildS13Row(history, SLOTS);

    let row = '<td class="s13-col-num">' + escapeHtml(String(territory.number)) + '</td>' +
      '<td class="s13-col-last">' + escapeHtml(data.lastCompleted) + '</td>';

    data.cells.forEach(function (c) {
      row += '<td class="s13-person">' + escapeHtml(c.person) + '</td>' +
        '<td class="s13-date">' + escapeHtml(c.startDate) + '</td>' +
        '<td class="s13-date">' + escapeHtml(c.endDate) + '</td>';
    });

    const tr = document.createElement('tr');
    tr.innerHTML = row;
    tbody.appendChild(tr);
  });

  sheet.appendChild(table);

  const footnote = document.createElement('p');
  footnote.className = 's13-footnote';
  footnote.textContent = t('s13.footnote');
  sheet.appendChild(footnote);

  container.appendChild(sheet);

  return function () {
    document.body.classList.remove('print-layout');
  };
}
