import { t } from '../i18n/i18n.js';
import { getStore, getUserProfile } from '../store/index.js';
import { renderOverviewMap } from '../components/map.js';
import { escapeHtml, formatDate, todayISO } from '../utils/helpers.js';
import { territoryTags, allTags, matchesTags, groupTags, splitTag } from '../utils/tags.js';
import { refresh } from '../router.js';
import {
  canAssignTerritory,
  canCreateTerritory,
  canDeleteTerritory,
  canEditTerritory,
  canViewFullHistory,
  ROLES
} from '../auth/permissions.js';

const VIEW_KEY = 'territory-cards-view';

function getViewPref() {
  try { return localStorage.getItem(VIEW_KEY) || 'cards'; } catch (e) { return 'cards'; }
}

const FILTER_KEY = 'territory-tag-filter';
const GROUP_KEY = 'territory-group-by-tag';

function getFilterPref() {
  try { return JSON.parse(localStorage.getItem(FILTER_KEY)) || []; } catch (e) { return []; }
}

function setFilterPref(tags) {
  try { localStorage.setItem(FILTER_KEY, JSON.stringify(tags)); } catch (e) { /* ignore */ }
}

const MAP_KEY = 'territory-map-visible';

function getMapPref() {
  try { return localStorage.getItem(MAP_KEY) === 'hidden' ? 'hidden' : 'shown'; } catch (e) { return 'shown'; }
}

function setMapPref(value) {
  try { localStorage.setItem(MAP_KEY, value); } catch (e) { /* ignore */ }
}

const SORT_KEY = 'territory-sort';

function getSortPref() {
  try { return localStorage.getItem(SORT_KEY) === 'houses' ? 'houses' : 'number'; } catch (e) { return 'number'; }
}

function setSortPref(value) {
  try { localStorage.setItem(SORT_KEY, value); } catch (e) { /* ignore */ }
}

function getGroupPref() {
  try { return localStorage.getItem(GROUP_KEY) === '1'; } catch (e) { return false; }
}

function setGroupPref(on) {
  try { localStorage.setItem(GROUP_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
}

function setViewPref(view) {
  try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* ignore */ }
}

// Cuantas asignaciones recientes se muestran bajo cada territorio (formulario S-13)
const RECENT_ASSIGNMENTS = 4;

// Tira compacta con las ultimas asignaciones: quien, cuando se asigno, cuando se completo.
// Da la frecuencia de trabajo del territorio de un vistazo, sin entrar al detalle.
function buildHistoryStrip(store, territoryId, fullHistory, uid) {
  const strip = document.createElement('div');
  strip.className = 'territory-grid-card-history';

  let entries = store.getHistoryForTerritory ? store.getHistoryForTerritory(territoryId) : [];
  if (!fullHistory) {
    entries = entries.filter(function (e) { return e.assignedToUid === uid; });
  }

  if (entries.length === 0) {
    strip.innerHTML = '<span class="history-strip-empty">' + escapeHtml(t('index.noAssignments')) + '</span>';
    return strip;
  }

  strip.innerHTML = entries.slice(0, RECENT_ASSIGNMENTS).map(function (e) {
    const end = formatDate(e.endDate) || t('show.historyInProgress');
    return '<span class="history-strip-row">' +
      '<span class="history-strip-person">' + escapeHtml(e.person || '—') + '</span>' +
      '<span class="history-strip-dates">' + escapeHtml(formatDate(e.startDate) || '?') + ' &rarr; ' + escapeHtml(end) + '</span>' +
    '</span>';
  }).join('');

  return strip;
}

export let isDirty = false;


// Repartir y recibir territorios es casi todo el trabajo del encargado, y antes
// obligaba a entrar a cada ficha. Este botón hace las dos cosas desde la lista.
function buildQuickAction(store, territory, profile, onDone) {
  if (!canAssignTerritory(profile)) return null;
  const active = store.getActiveAssignment ? store.getActiveAssignment(territory.id) : null;

  const btn = document.createElement('button');
  // Clase propia para que la acción principal conserve su peso aunque el resto
  // de botones de la ficha estén apagados a texto.
  btn.className = 'btn btn-sm quick-action ' + (active ? 'btn-secondary' : 'btn-primary');
  btn.textContent = active ? t('index.quickComplete') : t('index.quickAssign');
  btn.addEventListener('click', async function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (active) {
      if (!confirm(t('index.confirmComplete', { name: active.person }))) return;
      btn.disabled = true;
      await store.updateHistoryEntry(active.id, { status: 'completed', endDate: todayISO() });
      onDone();
      return;
    }

    const person = (window.prompt(t('index.promptAssign', { number: territory.number })) || '').trim();
    if (!person) return;
    btn.disabled = true;
    await store.addHistoryEntry({
      territoryId: territory.id,
      person: person,
      assignedToUid: null,
      startDate: todayISO(),
      endDate: null,
      notes: '',
      type: 'assignment',
      status: 'active'
    });
    onDone();
  });
  return btn;
}


// Lo que el encargado necesita saber antes que nada: qué lleva demasiado
// tiempo parado y qué asignación se quedó abierta. Antes eso sólo salía leyendo
// el S-13 entero o recorriendo las fichas una por una.
const DIAS_ABIERTA = 60;

function daysSince(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function buildPendingPanel(store, territories, profile, onDone) {
  const history = store.getAllHistory ? store.getAllHistory() : [];
  const lastEnd = new Map();
  territories.forEach(function (terr) { lastEnd.set(terr.id, null); });
  history.forEach(function (h) {
    if (!h.endDate) return;
    const prev = lastEnd.get(h.territoryId);
    if (!prev || h.endDate > prev) lastEnd.set(h.territoryId, h.endDate);
  });

  const stale = [];
  const never = [];
  const open = [];

  territories.forEach(function (terr) {
    const active = store.getActiveAssignment ? store.getActiveAssignment(terr.id) : null;
    if (active) {
      const d = daysSince(active.startDate);
      if (d !== null && d >= DIAS_ABIERTA) open.push({ terr, days: d, person: active.person });
      return;
    }
    const end = lastEnd.get(terr.id);
    if (!end) {
      if (!history.some(function (h) { return h.territoryId === terr.id; })) never.push({ terr });
      return;
    }
    const d = daysSince(end);
    if (d !== null) stale.push({ terr, days: d });
  });

  stale.sort(function (a, b) { return b.days - a.days; });
  open.sort(function (a, b) { return b.days - a.days; });

  const groups = [
    { key: 'pendingOpen', items: open.slice(0, 5), tone: 'warn' },
    { key: 'pendingNever', items: never.slice(0, 5), tone: 'warn' },
    { key: 'pendingStale', items: stale.slice(0, 5), tone: '' }
  ].filter(function (g) { return g.items.length > 0; });

  if (groups.length === 0) return null;

  const panel = document.createElement('section');
  panel.className = 'pending-panel';

  const head = document.createElement('h2');
  head.className = 'pending-title';
  head.textContent = t('index.pendingTitle');
  panel.appendChild(head);

  const cols = document.createElement('div');
  cols.className = 'pending-cols';

  groups.forEach(function (g) {
    const col = document.createElement('div');
    col.className = 'pending-col';
    const h = document.createElement('h3');
    h.textContent = t('index.' + g.key);
    col.appendChild(h);

    const ul = document.createElement('ul');
    g.items.forEach(function (it) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#/territories/' + it.terr.id;
      a.textContent = it.terr.number + ' · ' + it.terr.name;
      li.appendChild(a);

      if (it.days !== undefined) {
        const meta = document.createElement('span');
        meta.className = 'pending-meta' + (g.tone ? ' ' + g.tone : '');
        meta.textContent = it.person
          ? t('index.pendingWithPerson', { person: it.person, days: it.days })
          : t('index.pendingDays', { days: it.days });
        li.appendChild(meta);
      }

      const quick = buildQuickAction(store, it.terr, profile, onDone);
      if (quick) li.appendChild(quick);
      ul.appendChild(li);
    });
    col.appendChild(ul);
    cols.appendChild(col);
  });

  panel.appendChild(cols);
  return panel;
}

export function render(container) {
  const store = getStore();
  const profile = getUserProfile();
  const isPublisher = profile && profile.role === ROLES.PUBLISHER;
  const fullHistory = canViewFullHistory(profile);
  const uid = profile ? profile.uid : null;

  let territories = store.getAll().slice().sort(function (a, b) {
    return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
  });

  // Publisher: filtrar solo sus territorios asignados activamente
  if (isPublisher) {
    territories = territories.filter(function (terr) {
      const active = store.getActiveAssignment ? store.getActiveAssignment(terr.id) : null;
      return active && active.assignedToUid === profile.uid;
    });
  }

  let cleanup = null;

  // Empty state para publisher: solo "no tienes asignaciones"
  if (isPublisher && territories.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'welcome-screen';
    empty.innerHTML =
      '<h2>' + escapeHtml(t('auth.yourAssignments')) + '</h2>' +
      '<p>' + escapeHtml(t('auth.noAssignments')) + '</p>';
    container.appendChild(empty);
    return null;
  }

  // Empty state: welcome screen (solo no-publisher)
  if (territories.length === 0) {
    const welcome = document.createElement('div');
    welcome.className = 'welcome-screen';

    const icon = document.createElement('div');
    icon.className = 'welcome-icon';
    icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>';
    welcome.appendChild(icon);

    const h2 = document.createElement('h2');
    h2.textContent = t('welcome.title');
    welcome.appendChild(h2);

    const p = document.createElement('p');
    p.textContent = t('welcome.subtitle');
    welcome.appendChild(p);

    const primary = document.createElement('div');
    primary.className = 'welcome-primary';

    const createCard = document.createElement('a');
    createCard.href = '#/territories/new';
    createCard.className = 'welcome-card';
    createCard.innerHTML = '<div class="welcome-card-icon blue">+</div><span class="welcome-card-title">' + escapeHtml(t('welcome.createTerritory')) + '</span>';

    const demoCard = document.createElement('div');
    demoCard.className = 'welcome-card';
    demoCard.innerHTML = '<div class="welcome-card-icon green">&#9654;</div><span class="welcome-card-title">' + escapeHtml(t('welcome.loadDemo')) + '</span>';
    demoCard.addEventListener('click', function () {
      store.loadSample();
      refresh();
    });

    primary.appendChild(createCard);
    primary.appendChild(demoCard);
    welcome.appendChild(primary);

    const secondary = document.createElement('div');
    secondary.className = 'welcome-secondary';

    const loadJsonLink = document.createElement('button');
    loadJsonLink.textContent = t('welcome.loadJson');
    loadJsonLink.addEventListener('click', function () {
      document.getElementById('file-input').click();
    });

    const importKmlLink = document.createElement('button');
    importKmlLink.textContent = t('welcome.importKml');
    importKmlLink.addEventListener('click', function () {
      document.getElementById('kml-input').click();
    });

    secondary.appendChild(loadJsonLink);
    secondary.appendChild(importKmlLink);
    welcome.appendChild(secondary);
    container.appendChild(welcome);
    return null;
  }

  // Header row with view toggle
  const header = document.createElement('div');
  header.className = 'header-row';

  const headerLeft = document.createElement('div');
  headerLeft.style.cssText = 'display:flex;align-items:center;gap:0.75rem;';
  const h1 = document.createElement('h1');
  h1.textContent = isPublisher ? t('auth.yourAssignments') : t('index.title');
  headerLeft.appendChild(h1);

  // View toggle (cards / table)
  const viewToggle = document.createElement('div');
  viewToggle.className = 'view-toggle';

  const gridIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
  const listIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';

  const btnCards = document.createElement('button');
  btnCards.className = 'view-toggle-btn' + (getViewPref() === 'cards' ? ' active' : '');
  btnCards.innerHTML = gridIcon;
  btnCards.title = 'Cards';

  const btnTable = document.createElement('button');
  btnTable.className = 'view-toggle-btn' + (getViewPref() === 'table' ? ' active' : '');
  btnTable.innerHTML = listIcon;
  btnTable.title = 'Table';

  viewToggle.appendChild(btnCards);
  viewToggle.appendChild(btnTable);
  headerLeft.appendChild(viewToggle);
  header.appendChild(headerLeft);

  if (canCreateTerritory(profile)) {
    const newBtn = document.createElement('a');
    newBtn.href = '#/territories/new';
    newBtn.className = 'btn btn-primary';
    newBtn.textContent = t('index.newTerritory');
    header.appendChild(newBtn);
  }
  container.appendChild(header);

  // Filtro por etiquetas y agrupación. Sólo aparece si hay etiquetas puestas:
  // una congregación que no las usa no ve controles de más.
  const availableTags = allTags(territories);
  let selectedTags = getFilterPref().filter(function (tag) {
    return availableTags.some(function (a) { return a.toLowerCase() === String(tag).toLowerCase(); });
  });
  let groupByTag = getGroupPref();
  let sortBy = getSortPref();

  // Qué toca ahora, arriba del todo y sólo si hay algo que atender.
  const pendingHost = document.createElement('div');
  if (!isPublisher) container.appendChild(pendingHost);

  const filterBar = document.createElement('div');
  filterBar.className = 'tag-filter-bar';
  container.appendChild(filterBar);

  // El mapa ocupa un tercio de la pantalla y con la lista ya filtrada muchas
  // veces estorba. Se puede recoger, y la app lo recuerda.
  const mapHead = document.createElement('div');
  mapHead.className = 'list-head';

  const mapToggle = document.createElement('button');
  mapToggle.type = 'button';
  mapToggle.className = 'map-toggle';
  mapHead.appendChild(document.createElement('span'));
  mapHead.appendChild(mapToggle);
  container.appendChild(mapHead);

  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';
  container.appendChild(mapDiv);

  function paintMapToggle() {
    const hidden = getMapPref() === 'hidden';
    mapDiv.style.display = hidden ? 'none' : '';
    mapToggle.textContent = hidden ? t('index.showMap') : t('index.hideMap');
  }

  mapToggle.addEventListener('click', function () {
    setMapPref(getMapPref() === 'hidden' ? 'shown' : 'hidden');
    paintMapToggle();
    if (getMapPref() !== 'hidden') {
      window.setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
    }
  });
  paintMapToggle();

  // Un territorio con varias etiquetas sale bajo cada una: es justo lo que se
  // busca al pedir "muéstrame los de Pedro García" y "los de a pie".
  function groupsOf(list) {
    if (!groupByTag) return [{ label: null, items: list }];

    const byTag = new Map();
    const untagged = [];

    list.forEach(function (territory) {
      const tags = territoryTags(territory);
      if (tags.length === 0) { untagged.push(territory); return; }
      tags.forEach(function (tag) {
        const key = tag.toLowerCase();
        if (!byTag.has(key)) byTag.set(key, { label: tag, items: [] });
        byTag.get(key).items.push(territory);
      });
    });

    const groups = Array.from(byTag.values()).sort(function (a, b) {
      return a.label.localeCompare(b.label);
    });
    if (untagged.length > 0) groups.push({ label: t('index.untagged'), items: untagged });
    return groups;
  }

  function visibleTerritories() {
    const list = territories.filter(function (territory) { return matchesTags(territory, selectedTags); });
    if (sortBy !== 'houses') return list;
    // Por casas, de mayor a menor: es el orden con el que se reparte carga.
    // Los que no tienen conteo van al final, no al principio como haría un 0.
    return list.sort(function (a, b) {
      const ha = a.houses == null ? -1 : a.houses;
      const hb = b.houses == null ? -1 : b.houses;
      return hb - ha;
    });
  }

  function buildGroupHeading(label, count) {
    const heading = document.createElement('h2');
    heading.className = 'tag-group-heading';
    heading.textContent = label + ' (' + count + ')';
    return heading;
  }

  function paintFilterBar() {
    filterBar.innerHTML = '';

    // Las etiquetas se agrupan por su dimensión: zona en una fila, modo de
    // recorrido en otra. Antes salían todas en una tira alfabética donde Norte
    // y "a pie" competían como si fueran alternativas.
    groupTags(availableTags).forEach(function (g) {
      const row = document.createElement('div');
      row.className = 'tag-row';
      if (g.group) {
        const label = document.createElement('span');
        label.className = 'tag-row-label';
        label.textContent = g.group;
        row.appendChild(label);
      }
      g.tags.forEach(function (parsed) {
        const tag = parsed.full;
        const on = selectedTags.some(function (s) { return s.toLowerCase() === tag.toLowerCase(); });
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'tag-chip' + (on ? ' active' : '');
        chip.textContent = parsed.label;
        chip.addEventListener('click', function () {
          selectedTags = on
            ? selectedTags.filter(function (s) { return s.toLowerCase() !== tag.toLowerCase(); })
            : selectedTags.concat([tag]);
          setFilterPref(selectedTags);
          redraw();
        });
        row.appendChild(chip);
      });
      filterBar.appendChild(row);
    });

    if (selectedTags.length > 0) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'tag-chip tag-chip-clear';
      clear.textContent = t('index.clearFilter');
      clear.addEventListener('click', function () {
        selectedTags = [];
        setFilterPref(selectedTags);
        redraw();
      });
      filterBar.appendChild(clear);
    }

    // Con un filtro puesto, imprimir sólo esos: era la forma natural de sacar
    // las tarjetas de un sector sin imprimir el juego entero.
    if (selectedTags.length === 1 && canCreateTerritory(profile)) {
      const printTag = document.createElement('a');
      printTag.className = 'tag-chip tag-chip-print';
      printTag.href = '#/print?tag=' + encodeURIComponent(selectedTags[0]);
      printTag.textContent = t('index.printFiltered');
      filterBar.appendChild(printTag);
    }

    const sortSelect = document.createElement('select');
    sortSelect.className = 'tag-sort-select';
    [['number', t('index.sortByNumber')], ['houses', t('index.sortByHouses')]].forEach(function (opt) {
      const option = document.createElement('option');
      option.value = opt[0];
      option.textContent = opt[1];
      if (sortBy === opt[0]) option.selected = true;
      sortSelect.appendChild(option);
    });
    sortSelect.addEventListener('change', function () {
      sortBy = sortSelect.value;
      setSortPref(sortBy);
      redraw();
    });
    filterBar.appendChild(sortSelect);

    if (availableTags.length === 0) return;

    const groupLabel = document.createElement('label');
    groupLabel.className = 'tag-group-toggle';
    const groupCheck = document.createElement('input');
    groupCheck.type = 'checkbox';
    groupCheck.checked = groupByTag;
    groupCheck.addEventListener('change', function () {
      groupByTag = groupCheck.checked;
      setGroupPref(groupByTag);
      redraw();
    });
    groupLabel.appendChild(groupCheck);
    groupLabel.appendChild(document.createTextNode(' ' + t('index.groupByTag')));
    filterBar.appendChild(groupLabel);
  }

  // El mapa también obedece el filtro: filtrar "a pie" y seguir viendo todo
  // dibujado sería mentir.
  function redraw() {
    paintFilterBar();
    if (!isPublisher) {
      pendingHost.innerHTML = '';
      const panel = buildPendingPanel(store, territories, profile, redraw);
      if (panel) pendingHost.appendChild(panel);
    }
    if (cleanup) cleanup();
    cleanup = renderOverviewMap(mapDiv, visibleTerritories());
    if (getViewPref() === 'table') renderTable(); else renderCards();
  }

  // Content area (cards or table)
  const contentArea = document.createElement('div');
  container.appendChild(contentArea);

  function buildCard(territory) {
      const card = document.createElement('a');
      card.href = '#/territories/' + territory.id;
      card.className = 'territory-grid-card';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'territory-grid-card-header';
      const num = document.createElement('span');
      num.className = 'territory-grid-card-number';
      num.textContent = territory.number;
      cardHeader.appendChild(num);
      // El estado va donde el ojo ya mira, junto al número. Antes era una
      // etiqueta más entre los contadores.
      const activeForPill = store.getActiveAssignment ? store.getActiveAssignment(territory.id) : null;
      const pill = document.createElement('span');
      pill.className = 'state-pill ' + (activeForPill ? 'out' : 'free');
      pill.textContent = activeForPill ? activeForPill.person : t('show.available');
      cardHeader.appendChild(pill);
      card.appendChild(cardHeader);

      const name = document.createElement('div');
      name.className = 'territory-grid-card-name';
      name.textContent = territory.name;
      if (!territory.polygon || territory.polygon.length < 3) {
        const undrawn = document.createElement('span');
        undrawn.className = 'undrawn-flag';
        undrawn.textContent = t('index.undrawn');
        name.appendChild(undrawn);
      }
      card.appendChild(name);

      const meta = document.createElement('div');
      meta.className = 'territory-grid-card-meta';
      const lmCount = (territory.landmarks || []).length;
      meta.innerHTML = '<span>' + escapeHtml(lmCount === 0
        ? t('index.noLandmarks')
        : t(lmCount === 1 ? 'index.oneLandmark' : 'index.someLandmarks', { count: lmCount })) + '</span>';
      if (territory.houses) {
        meta.innerHTML += '<span>' + escapeHtml(t('show.housesCount', { count: territory.houses })) + '</span>';
      }

      const cardTags = territoryTags(territory);
      if (cardTags.length > 0) {
        meta.innerHTML += '<span class="territory-grid-card-group">' +
          escapeHtml(cardTags.map(function (x) { return splitTag(x).label; }).join(' · ')) + '</span>';
      }

      card.appendChild(meta);
      card.appendChild(buildHistoryStrip(store, territory.id, fullHistory, uid));

      const actions = document.createElement('div');
      actions.className = 'territory-grid-card-actions';

      const cardLink = document.createElement('a');
      cardLink.href = '#/territories/' + territory.id + '/card';
      cardLink.className = 'btn btn-secondary btn-sm';
      cardLink.textContent = t('index.btnCard');
      cardLink.addEventListener('click', function (e) { e.stopPropagation(); });

      actions.appendChild(cardLink);

      if (canEditTerritory(profile)) {
        const editLink = document.createElement('a');
        editLink.href = '#/territories/' + territory.id + '/edit';
        editLink.className = 'btn btn-secondary btn-sm';
        editLink.textContent = t('index.btnEdit');
        editLink.addEventListener('click', function (e) { e.stopPropagation(); });
        actions.appendChild(editLink);
      }

      // Eliminar sale de la lista: vive en la ficha, discreto y al fondo, que es
      // donde corresponde a una acción que no se deshace.
      const quick = buildQuickAction(store, territory, profile, redraw);
      if (quick) actions.appendChild(quick);

      card.appendChild(actions);
      return card;
  }

  function renderCards() {
    contentArea.innerHTML = '';
    groupsOf(visibleTerritories()).forEach(function (group) {
      if (group.label !== null) contentArea.appendChild(buildGroupHeading(group.label, group.items.length));
      const grid = document.createElement('div');
      grid.className = 'territory-grid';
      group.items.forEach(function (territory) { grid.appendChild(buildCard(territory)); });
      contentArea.appendChild(grid);
    });
  }

  function buildRow(territory) {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a') || e.target.closest('button')) return;
        window.location.hash = '#/territories/' + territory.id;
      });

      const tdNum = document.createElement('td');
      tdNum.className = 'number';
      tdNum.textContent = territory.number;

      const tdName = document.createElement('td');
      const nameLink = document.createElement('a');
      nameLink.href = '#/territories/' + territory.id;
      nameLink.textContent = territory.name;
      tdName.appendChild(nameLink);
      if (!territory.polygon || territory.polygon.length < 3) {
        const undrawn = document.createElement('span');
        undrawn.className = 'undrawn-flag';
        undrawn.textContent = t('index.undrawn');
        tdName.appendChild(undrawn);
      }

      const tdGroup = document.createElement('td');
      tdGroup.textContent = territoryTags(territory).map(function (x) { return splitTag(x).label; }).join(', ');

      const tdHouses = document.createElement('td');
      tdHouses.textContent = territory.houses ? String(territory.houses) : '';

      const tdLandmarks = document.createElement('td');
      tdLandmarks.textContent = territory.landmarks.length;

      const tdHistory = document.createElement('td');
      tdHistory.className = 'history-cell';
      tdHistory.appendChild(buildHistoryStrip(store, territory.id, fullHistory, uid));

      const tdActions = document.createElement('td');
      tdActions.className = 'actions';

      const cardLink = document.createElement('a');
      cardLink.href = '#/territories/' + territory.id + '/card';
      cardLink.className = 'btn btn-secondary btn-sm';
      cardLink.textContent = t('index.btnCard');
      tdActions.appendChild(cardLink);

      if (canEditTerritory(profile)) {
        const editLink = document.createElement('a');
        editLink.href = '#/territories/' + territory.id + '/edit';
        editLink.className = 'btn btn-secondary btn-sm';
        editLink.textContent = t('index.btnEdit');
        tdActions.appendChild(editLink);
      }

      const quickRow = buildQuickAction(store, territory, profile, redraw);
      if (quickRow) tdActions.appendChild(quickRow);

      tr.appendChild(tdNum);
      tr.appendChild(tdName);
      tr.appendChild(tdGroup);
      tr.appendChild(tdHouses);
      tr.appendChild(tdLandmarks);
      tr.appendChild(tdHistory);
      tr.appendChild(tdActions);
      return tr;
  }

  function renderTable() {
    contentArea.innerHTML = '';
    const thead = '<thead><tr><th>' + escapeHtml(t('index.colNumber')) + '</th><th>' + escapeHtml(t('index.colName')) + '</th><th>' + escapeHtml(t('index.colTags')) + '</th><th>' + escapeHtml(t('index.colHouses')) + '</th><th>' + escapeHtml(t('index.colLandmarks')) + '</th><th>' + escapeHtml(t('index.colHistory')) + '</th><th></th></tr></thead>';

    groupsOf(visibleTerritories()).forEach(function (group) {
      if (group.label !== null) contentArea.appendChild(buildGroupHeading(group.label, group.items.length));
      const table = document.createElement('table');
      table.className = 'territory-table';
      table.innerHTML = thead + '<tbody></tbody>';
      const tbodyEl = table.querySelector('tbody');
      group.items.forEach(function (territory) { tbodyEl.appendChild(buildRow(territory)); });
      contentArea.appendChild(table);
    });
  }

  function switchView(view) {
    setViewPref(view);
    btnCards.classList.toggle('active', view === 'cards');
    btnTable.classList.toggle('active', view === 'table');
    if (view === 'cards') renderCards(); else renderTable();
  }

  btnCards.addEventListener('click', function () { switchView('cards'); });
  btnTable.addEventListener('click', function () { switchView('table'); });

  redraw();

  return function () {
    if (cleanup) cleanup();
  };
}
