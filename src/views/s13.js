import { t } from '../i18n/i18n.js';
import { getStore, getUserProfile } from '../store/index.js';
import { escapeHtml, formatDate, todayISO } from '../utils/helpers.js';
import { canViewPrintAll, canClearS13 } from '../auth/permissions.js';

export let isDirty = false;

// Columnas de asignación del formulario S-13 impreso.
const SLOTS = 4;

// Año de servicio: 1 de septiembre – 31 de agosto. Internamente se identifica
// por el año en que termina (el que va de sept/2025 a ago/2026 es el 2026);
// en pantalla siempre se muestra el rango — ver serviceYearLabel.
export function serviceYear(date) {
  const y = date.getFullYear();
  return date.getMonth() >= 8 ? y + 1 : y;
}

// Igual, pero sobre una fecha ISO ('YYYY-MM-DD') como las que guarda el store.
export function serviceYearOf(isoDate) {
  if (!isoDate) return null;
  const parts = String(isoDate).split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (!y || !m) return null;
  return m >= 9 ? y + 1 : y;
}

// Primer día del año de servicio, para separar lo anterior de lo de este año.
function serviceYearStart(year) {
  return (year - 1) + '-09-01';
}

// El año de servicio se nombra por el rango que abarca, no por el año en que
// termina: el que arranca en septiembre de 2026 se llama "2026-2027".
export function serviceYearLabel(year) {
  return (year - 1) + '-' + year;
}

/**
 * Convierte el historial de un territorio en una fila del S-13.
 * `history` viene en orden descendente por startDate (como lo devuelve el store).
 * Si se pasa `year`, sólo entran las asignaciones de ese año de servicio.
 */
export function buildS13Row(history, slots, year) {
  const assignments = history.filter(function (e) {
    return (e.type || 'assignment') === 'assignment';
  });

  const shown = year
    ? assignments.filter(function (e) { return serviceYearOf(e.startDate) === year; })
    : assignments;

  // Con un año elegido, esta columna es el acarreo del formulario: la última vez
  // que se completó ANTES de que empezara ese año. Sin filtro, la última de todas.
  const cutoff = year ? serviceYearStart(year) : null;
  const lastCompleted = assignments
    .filter(function (e) { return e.endDate && (!cutoff || e.endDate < cutoff); })
    .map(function (e) { return e.endDate; })
    .sort()
    .pop() || '';

  // Las últimas `slots` asignaciones, en orden cronológico como en el formulario impreso.
  const recent = shown.slice(0, slots).reverse();
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

/**
 * Deja fuera lo anterior al corte. Limpiar el S-13 no borra nada: las entradas
 * siguen en el historial de cada territorio, sólo dejan de contar para la hoja.
 * Se compara por la fecha de asignación (ISO, comparable como string).
 */
export function afterCutoff(entries, cutoff) {
  if (!cutoff) return entries;
  return entries.filter(function (e) { return (e.startDate || '') >= cutoff; });
}

// Años de servicio presentes en los datos, del más reciente al más viejo.
export function availableServiceYears(allHistory) {
  const years = new Set();
  allHistory.forEach(function (e) {
    const y = serviceYearOf(e.startDate);
    if (y) years.add(y);
  });
  return Array.from(years).sort(function (a, b) { return b - a; });
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

  const cutoff = store.getS13Cutoff ? store.getS13Cutoff() : null;

  // El historial se lee una vez por territorio y se reusa al cambiar de año.
  const historyByTerritory = {};
  const allEntries = [];
  territories.forEach(function (terr) {
    const h = afterCutoff(store.getHistoryForTerritory ? store.getHistoryForTerritory(terr.id) : [], cutoff);
    historyByTerritory[terr.id] = h;
    Array.prototype.push.apply(allEntries, h);
  });

  const years = availableServiceYears(allEntries);
  let selectedYear = null; // null = todos los años

  document.body.classList.add('print-layout');

  // Controles (no se imprimen)
  const controls = document.createElement('div');
  controls.className = 'no-print';
  controls.style.cssText = 'padding:1.5rem;text-align:center;';
  controls.innerHTML = '<h2 style="font-size:1.25rem;">' + escapeHtml(t('s13.title')) + '</h2>' +
    '<p style="color:var(--text-secondary);font-size:0.875rem;">' + escapeHtml(t('s13.subtitle')) + '</p>';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'margin-top:0.5rem;display:flex;gap:0.5rem;justify-content:center;align-items:center;flex-wrap:wrap;';

  if (years.length > 0) {
    const filterLabel = document.createElement('label');
    filterLabel.style.cssText = 'font-size:0.875rem;color:var(--text-secondary);';
    filterLabel.textContent = t('s13.serviceYear') + ':';

    const currentYear = serviceYear(new Date());

    const yearSelect = document.createElement('select');
    yearSelect.className = 'history-input';
    yearSelect.style.width = 'auto';
    yearSelect.innerHTML = '<option value="">' + escapeHtml(t('s13.allYears')) + '</option>' +
      years.map(function (y) {
        const label = serviceYearLabel(y) + (y === currentYear ? ' ' + t('s13.currentYear') : '');
        return '<option value="' + y + '">' + escapeHtml(label) + '</option>';
      }).join('');
    yearSelect.addEventListener('change', function () {
      selectedYear = yearSelect.value ? parseInt(yearSelect.value, 10) : null;
      renderSheet();
    });

    filterLabel.appendChild(yearSelect);
    btnRow.appendChild(filterLabel);

    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:0.75rem;color:var(--text-muted);flex-basis:100%;';
    hint.textContent = t('s13.serviceYearHint');
    btnRow.appendChild(hint);
  }

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
  btnRow.appendChild(backBtn);

  // Limpiar la hoja: sólo admin, y sólo cambia desde dónde cuenta el registro.
  if (canClearS13(profile) && store.setS13Cutoff) {
    const clearBtn = document.createElement('button');
    clearBtn.className = cutoff ? 'btn btn-secondary' : 'btn btn-danger';
    clearBtn.textContent = cutoff ? t('s13.restore') : t('s13.clear');
    clearBtn.addEventListener('click', async function () {
      if (!confirm(cutoff ? t('s13.confirmRestore') : t('s13.confirmClear'))) return;
      clearBtn.disabled = true;
      try {
        await store.setS13Cutoff(cutoff ? null : todayISO());
        // La hoja entera depende del corte (años disponibles incluidos): se
        // vuelve a dibujar desde cero en vez de parchear trozos.
        container.innerHTML = '';
        render(container);
      } catch (e) {
        console.error('No se pudo cambiar el corte del S-13:', e);
        alert(t('s13.clearFailed'));
        clearBtn.disabled = false;
      }
    });
    btnRow.appendChild(clearBtn);
  }

  controls.appendChild(btnRow);

  if (cutoff) {
    const cutoffNote = document.createElement('p');
    cutoffNote.className = 'no-print';
    cutoffNote.style.cssText = 'font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;';
    cutoffNote.textContent = t('s13.clearedSince', { date: formatDate(cutoff) });
    controls.appendChild(cutoffNote);
  }

  container.appendChild(controls);

  const sheet = document.createElement('div');
  sheet.className = 's13-sheet';
  container.appendChild(sheet);

  function renderSheet() {
    sheet.innerHTML = '';

    const head = document.createElement('div');
    head.className = 's13-head';
    head.innerHTML = '<h3>' + escapeHtml(t('s13.formTitle')) + '</h3>' +
      '<p>' + escapeHtml(t('s13.serviceYear')) + ': <strong>' +
      escapeHtml(selectedYear ? serviceYearLabel(selectedYear) : t('s13.allYears')) + '</strong></p>';
    sheet.appendChild(head);

    // La tabla tiene 14 columnas: en pantalla angosta se desplaza en su propio
    // contenedor en vez de comprimirse hasta truncar las fechas.
    const scroller = document.createElement('div');
    scroller.className = 's13-scroll';

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
      const data = buildS13Row(historyByTerritory[territory.id] || [], SLOTS, selectedYear);

      // Fechas cortas: en la columna del formulario impreso no entra un ISO.
      const short = function (iso) { return escapeHtml(formatDate(iso, { short: true })); };

      // El número enlaza al territorio: desde aquí se ve el dato mal y se
      // corrige en un clic, sin buscarlo en la lista.
      let row = '<td class="s13-col-num">' +
          '<a href="#/territories/' + encodeURIComponent(territory.id) + '">' +
          escapeHtml(String(territory.number)) + '</a>' +
        '</td>' +
        '<td class="s13-col-last">' + short(data.lastCompleted) + '</td>';

      data.cells.forEach(function (c) {
        row += '<td class="s13-person">' + escapeHtml(c.person) + '</td>' +
          '<td class="s13-date">' + short(c.startDate) + '</td>' +
          '<td class="s13-date">' + short(c.endDate) + '</td>';
      });

      const tr = document.createElement('tr');
      tr.innerHTML = row;
      tbody.appendChild(tr);
    });

    scroller.appendChild(table);
    sheet.appendChild(scroller);

    const footnote = document.createElement('p');
    footnote.className = 's13-footnote';
    footnote.textContent = t('s13.footnote');
    sheet.appendChild(footnote);
  }

  renderSheet();

  return function () {
    document.body.classList.remove('print-layout');
  };
}
