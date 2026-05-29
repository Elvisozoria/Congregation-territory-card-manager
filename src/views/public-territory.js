import L from 'leaflet';
import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/helpers.js';
import { normalizePublicId } from '../utils/public-id.js';

const WORLD_BOUNDS = [[90, -180], [90, 180], [-90, 180], [-90, -180]];

export let isDirty = false;

export function render(container, params) {
  const congPublicId = normalizePublicId(params.congPublicId);
  const terPublicId = normalizePublicId(params.terPublicId);

  const wrapper = document.createElement('div');
  wrapper.className = 'public-territory-view';
  wrapper.style.cssText = 'max-width:900px;margin:0 auto;padding:1rem;';

  const loading = document.createElement('p');
  loading.style.cssText = 'padding:2rem;text-align:center;color:var(--text-secondary);';
  loading.textContent = t('admin.loading');
  wrapper.appendChild(loading);

  container.appendChild(wrapper);

  let cleanup = null;

  loadAndRender(wrapper, congPublicId, terPublicId).then(function (fn) {
    cleanup = fn;
  }).catch(function (err) {
    console.error('Public view error:', err);
    wrapper.innerHTML = '<p style="padding:2rem;color:#991B1B;">' + escapeHtml(t('alert.notFound')) + '</p>';
  });

  return function () {
    if (cleanup) cleanup();
  };
}

async function loadAndRender(wrapper, congPublicId, terPublicId) {
  const { doc, getDoc } = await import('firebase/firestore');
  const { db } = await import('../firebase/config.js');

  // 1) Resolver publicLinks/{terPublicId} → { congId, terId }
  const linkSnap = await getDoc(doc(db, 'publicLinks', terPublicId));
  if (!linkSnap.exists()) {
    wrapper.innerHTML = '<p style="padding:2rem;">' + escapeHtml(t('alert.notFound')) + '</p>';
    return function () {};
  }
  const link = linkSnap.data();

  // 2) Validar congPublicId (sanity check)
  if (link.congPublicId && link.congPublicId !== congPublicId) {
    wrapper.innerHTML = '<p style="padding:2rem;">' + escapeHtml(t('alert.notFound')) + '</p>';
    return function () {};
  }

  // 3) Cargar territorio
  const terSnap = await getDoc(doc(db, 'congregations', link.congId, 'territories', link.terId));
  if (!terSnap.exists()) {
    wrapper.innerHTML = '<p style="padding:2rem;">' + escapeHtml(t('alert.notFound')) + '</p>';
    return function () {};
  }
  const territory = { id: terSnap.id, ...terSnap.data() };

  // Convertir polygon de Firestore ({lng,lat}) a [lng,lat]
  if (Array.isArray(territory.polygon)) {
    territory.polygon = territory.polygon.map(function (c) {
      if (Array.isArray(c)) return c;
      return [c.lng, c.lat];
    });
  }

  // 4) Render
  wrapper.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:1rem;';
  header.innerHTML =
    '<h1 style="margin:0;font-size:1.5rem;">' + escapeHtml(territory.number || '') + ' - ' + escapeHtml(territory.name || '') + '</h1>';
  if (territory.group_name) {
    header.innerHTML += '<p style="margin:0.25rem 0 0;color:var(--text-secondary);font-size:0.875rem;">' + escapeHtml(territory.group_name) + '</p>';
  }
  wrapper.appendChild(header);

  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';
  mapDiv.style.cssText = 'height:60vh;min-height:400px;border-radius:8px;overflow:hidden;';
  wrapper.appendChild(mapDiv);

  const map = L.map(mapDiv);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  let center = null;

  if (territory.polygon && territory.polygon.length >= 3) {
    const coords = territory.polygon.map(function (c) { return [c[1], c[0]]; });

    L.polygon(coords, { color: '#1E40AF', weight: 3, fillOpacity: 0 }).addTo(map);
    L.polygon([WORLD_BOUNDS, coords], {
      color: 'none', fillColor: 'white', fillOpacity: 0.20, stroke: false
    }).addTo(map);

    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [30, 30] });
    center = bounds.getCenter();
  } else {
    map.setView([0, 0], 2);
  }

  // Landmarks locales
  (territory.landmarks || []).forEach(function (lm) {
    L.circleMarker([lm.lat, lm.lng], {
      radius: 7, fillColor: lm.color || '#3B82F6', color: '#1F2937', weight: 2, fillOpacity: 1
    }).addTo(map).bindTooltip(lm.name, { permanent: true, direction: 'right', offset: [10, 0], className: 'landmark-tooltip' });
  });

  // Manzanas
  (territory.blocks || []).forEach(function (b) {
    if (!b.lat || !b.lng) return;
    const labelIcon = L.divIcon({
      className: '',
      html: '<span class="block-label">' + escapeHtml(b.number || '') + '</span>',
      iconSize: null
    });
    L.marker([b.lat, b.lng], { icon: labelIcon, interactive: false }).addTo(map);
  });

  setTimeout(function () { map.invalidateSize(); }, 200);

  // Acciones
  const actions = document.createElement('div');
  actions.style.cssText = 'margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;';

  const gmapsBtn = document.createElement('a');
  gmapsBtn.className = 'btn btn-primary';
  gmapsBtn.target = '_blank';
  gmapsBtn.rel = 'noopener';
  if (center) {
    gmapsBtn.href = 'https://www.google.com/maps/@' + center.lat + ',' + center.lng + ',17z';
  } else {
    gmapsBtn.href = '#';
    gmapsBtn.style.opacity = '0.5';
  }
  gmapsBtn.textContent = t('public.openInMaps');
  actions.appendChild(gmapsBtn);

  wrapper.appendChild(actions);

  return function () {
    map.remove();
  };
}
