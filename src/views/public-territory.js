import L from 'leaflet';
import { baseLayer } from '../components/tiles.js';
import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/helpers.js';
import { normalizePublicId } from '../utils/public-id.js';
import { territoryTags } from '../utils/tags.js';
import { normalizeStyle, startPoint, googleMapsDirections, wazeDirections } from '../utils/map-style.js';

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

  // La apariencia la decide la congregación; su documento es público cuando
  // tiene publicId, que es la condición para que exista este enlace.
  let style = null;
  try {
    const congSnap = await getDoc(doc(db, 'congregations', link.congId));
    style = normalizeStyle(congSnap.exists() ? congSnap.data().mapStyle : null);
  } catch (e) {
    style = normalizeStyle(null);
  }

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
  const tags = territoryTags(territory);
  if (tags.length > 0) {
    header.innerHTML += '<p style="margin:0.25rem 0 0;color:var(--text-secondary);font-size:0.875rem;">' + escapeHtml(tags.join(' · ')) + '</p>';
  }
  wrapper.appendChild(header);

  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';
  mapDiv.style.cssText = 'height:60vh;min-height:400px;border-radius:8px;overflow:hidden;';
  wrapper.appendChild(mapDiv);

  const map = L.map(mapDiv);
  baseLayer(territory.cardLayer || style.base).addTo(map);

  let center = null;

  if (territory.polygon && territory.polygon.length >= 3) {
    const coords = territory.polygon.map(function (c) { return [c[1], c[0]]; });

    L.polygon(coords, {
      color: style.outlineColor, weight: style.outlineWeight,
      fillColor: style.outlineColor, fillOpacity: style.fill / 100
    }).addTo(map);
    // Mismo velo que en la tarjeta: lo de fuera se apaga, el territorio no.
    if (style.veil > 0) {
      L.polygon([WORLD_BOUNDS, coords], {
        color: 'none', fillColor: '#F3F4F6', fillOpacity: style.veil / 100, stroke: false
      }).addTo(map);
    }

    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [30, 30] });
    center = bounds.getCenter();
  } else {
    map.setView([0, 0], 2);
  }

  // Landmarks locales
  (territory.landmarks || []).forEach(function (lm) {
    L.circleMarker([lm.lat, lm.lng], {
      radius: lm.isStart ? 9 : 7, fillColor: lm.color || '#3B82F6', color: '#1F2937', weight: 2, fillOpacity: 1
    }).addTo(map)
      .bindTooltip(lm.name, { permanent: true, direction: 'right', offset: [10, 0], className: 'landmark-tooltip' })
      .on('click', function () { window.open(googleMapsDirections(lm.lat, lm.lng), '_blank', 'noopener'); });
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

  // Antes el botón abría Google Maps centrado en el polígono, sin pin ni
  // ruta: a quien nunca ha ido lo dejaba mirando un mapa en medio del campo.
  // Ahora es una ruta hasta la entrada, o hasta el centro si nadie la marcó.
  const start = startPoint(territory, center);

  function navLink(label, href, primary) {
    const a = document.createElement('a');
    a.className = 'btn ' + (primary ? 'btn-primary' : 'btn-secondary');
    a.target = '_blank';
    a.rel = 'noopener';
    if (href) {
      a.href = href;
    } else {
      a.href = '#';
      a.style.opacity = '0.5';
    }
    a.textContent = label;
    return a;
  }

  actions.appendChild(navLink(t('public.openInMaps'), start && googleMapsDirections(start.lat, start.lng), true));
  actions.appendChild(navLink(t('public.openInWaze'), start && wazeDirections(start.lat, start.lng), false));
  wrapper.appendChild(actions);

  if (start) {
    const hint = document.createElement('p');
    hint.style.cssText = 'margin:0.5rem 0 0;font-size:0.875rem;color:var(--text-secondary);';
    hint.textContent = start.isStart ? t('public.goesToStart') : t('public.goesToCentre');
    wrapper.appendChild(hint);
  }

  const lms = territory.landmarks || [];
  if (lms.length > 0) {
    const h2 = document.createElement('h2');
    h2.style.cssText = 'font-size:1.125rem;margin:1.5rem 0 0.5rem;';
    h2.textContent = t('public.landmarks');
    wrapper.appendChild(h2);

    const ul = document.createElement('ul');
    ul.className = 'landmark-list';
    ul.style.cssText = 'list-style:none;padding:0;margin:0;';
    lms.forEach(function (lm) {
      const li = document.createElement('li');
      li.className = 'landmark-item';
      const dot = document.createElement('span');
      dot.className = 'landmark-dot';
      dot.style.background = lm.color || '#3B82F6';
      const info = document.createElement('div');
      info.className = 'landmark-info';
      info.innerHTML = '<span class="landmark-name">' + escapeHtml(lm.name) +
        (lm.isStart ? ' <span class="global-badge">' + escapeHtml(t('show.startBadge')) + '</span>' : '') + '</span>' +
        (lm.description ? '<div class="landmark-description">' + escapeHtml(lm.description) + '</div>' : '');
      li.appendChild(dot);
      li.appendChild(info);
      li.appendChild(navLink(t('public.directions'), googleMapsDirections(lm.lat, lm.lng), false));
      ul.appendChild(li);
    });
    wrapper.appendChild(ul);
  }

  return function () {
    map.remove();
  };
}
