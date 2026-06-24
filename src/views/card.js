import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { t } from '../i18n/i18n.js';
import { getStore, getUserProfile } from '../store/index.js';
import { renderCardMap } from '../components/card-map.js';
import { escapeHtml } from '../utils/helpers.js';
import { buildPublicTerritoryUrl } from '../utils/public-id.js';
import { canViewTerritory, canEditCardZoom } from '../auth/permissions.js';

export let isDirty = false;

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
}

export function render(container, params) {
  const store = getStore();
  const profile = getUserProfile();
  const territory = store.getById(params.id);
  if (!territory) {
    container.innerHTML = '<p>' + escapeHtml(t('alert.notFound')) + '</p><a href="#/" class="btn btn-secondary">' + escapeHtml(t('card.back')) + '</a>';
    return null;
  }

  const activeAssignment = store.getActiveAssignment ? store.getActiveAssignment(params.id) : null;
  if (!canViewTerritory(profile, territory, activeAssignment)) {
    container.innerHTML = '<p style="padding:2rem;">' + escapeHtml(t('auth.noTerritoryAccess')) + '</p><a href="#/" class="btn btn-secondary" style="margin-left:2rem;">' + escapeHtml(t('card.back')) + '</a>';
    return null;
  }

  const allowEditView = canEditCardZoom(profile);
  const fileName = territory.number + '-' + territory.name.toLowerCase().replace(/\s+/g, '-');

  let cardController = null;
  let editMode = false;
  let pendingView = null;

  const wrapper = document.createElement('div');
  wrapper.className = 'card-view-wrapper';

  // Controls (no-print)
  const controls = document.createElement('div');
  controls.className = 'card-controls no-print';
  controls.innerHTML = '<h2>' + escapeHtml(territory.number) + ' - ' + escapeHtml(territory.name) + '</h2>';

  const downloadBtn = document.createElement('a');
  downloadBtn.href = '#';
  downloadBtn.className = 'btn btn-primary btn-sm';
  downloadBtn.textContent = t('card.downloadPng');
  downloadBtn.addEventListener('click', function (e) {
    e.preventDefault();
    downloadCard();
  });

  const printBtn = document.createElement('a');
  printBtn.href = '#';
  printBtn.className = 'btn btn-secondary btn-sm';
  printBtn.textContent = t('card.print');
  printBtn.addEventListener('click', function (e) {
    e.preventDefault();
    window.print();
  });

  // Share button (online mode)
  let shareBtn = null;
  if (profile && profile.congregationId) {
    shareBtn = document.createElement('button');
    shareBtn.className = 'btn btn-secondary btn-sm';
    shareBtn.textContent = t('share.button');
    shareBtn.addEventListener('click', shareLink);
  }

  // Edit view toggle / Save / Reset
  let editToggleBtn = null;
  let saveViewBtn = null;
  let resetViewBtn = null;
  if (allowEditView) {
    editToggleBtn = document.createElement('button');
    editToggleBtn.className = 'btn btn-secondary btn-sm';
    editToggleBtn.textContent = t('card.enableEditView');
    editToggleBtn.addEventListener('click', toggleEditMode);

    saveViewBtn = document.createElement('button');
    saveViewBtn.className = 'btn btn-primary btn-sm';
    saveViewBtn.textContent = t('card.saveView');
    saveViewBtn.style.display = 'none';
    saveViewBtn.addEventListener('click', saveCurrentView);

    resetViewBtn = document.createElement('button');
    resetViewBtn.className = 'btn btn-secondary btn-sm';
    resetViewBtn.textContent = t('card.resetView');
    resetViewBtn.style.display = 'none';
    resetViewBtn.addEventListener('click', resetView);
  }

  const backBtn = document.createElement('a');
  backBtn.href = '#/territories/' + territory.id;
  backBtn.className = 'btn btn-secondary btn-sm';
  backBtn.textContent = t('card.back');

  controls.appendChild(downloadBtn);
  controls.appendChild(printBtn);
  if (shareBtn) controls.appendChild(shareBtn);
  if (editToggleBtn) controls.appendChild(editToggleBtn);
  if (saveViewBtn) controls.appendChild(saveViewBtn);
  if (resetViewBtn) controls.appendChild(resetViewBtn);
  controls.appendChild(backBtn);
  wrapper.appendChild(controls);

  // Card
  const card = document.createElement('div');
  card.id = 'territory-card';
  card.className = 'territory-card';

  const label = document.createElement('div');
  label.className = 'card-label';
  label.style.cssText = 'position:absolute;top:8px;left:8px;z-index:1000;background:rgba(255,255,255,0.9);padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.875rem;color:#1F2937;';
  label.textContent = territory.number + ' - ' + territory.name;
  card.appendChild(label);

  // QR: mostrar solo si showQr está activado (o legacy qr_url existe)
  const congPubId = store.getCongregationPublicId ? store.getCongregationPublicId() : null;
  const publicUrl = (congPubId && territory.publicId) ? buildPublicTerritoryUrl(congPubId, territory.publicId) : '';
  const shouldShowQr = territory.showQr || territory.qr_url;
  const qrUrlForRender = shouldShowQr ? (publicUrl || territory.qr_url || '') : '';

  // Auto-heal: territorios antiguos/importados pueden tener showQr activado pero
  // sin publicId, así que la URL pública queda vacía y el QR no se dibuja. En ese
  // caso generamos el publicId on-the-fly y pintamos el QR cuando esté listo.
  const needsQrHeal = shouldShowQr && !qrUrlForRender && !!congPubId &&
    !territory.publicId && typeof store.ensureTerritoryPublicId === 'function';

  let qrContainer = null;
  if (qrUrlForRender || needsQrHeal) {
    qrContainer = document.createElement('div');
    qrContainer.className = 'qr-container';
    qrContainer.style.cssText = 'position:absolute;bottom:8px;right:8px;z-index:1000;background:white;padding:4px;';
    if (qrUrlForRender) qrContainer.setAttribute('data-qr-url', qrUrlForRender);
    card.appendChild(qrContainer);
  }

  const mapDiv = document.createElement('div');
  mapDiv.className = 'card-map';
  card.appendChild(mapDiv);

  card.style.position = 'relative';
  wrapper.appendChild(card);
  container.appendChild(wrapper);

  const globalLandmarks = store.getGlobalLandmarks ? store.getGlobalLandmarks() : [];
  cardController = renderCardMap(card, territory, globalLandmarks, {
    editable: false,
    qrUrl: qrUrlForRender,
    onViewChange: function (v) { pendingView = v; }
  });

  if (needsQrHeal) {
    store.ensureTerritoryPublicId(territory.id).then(function (pubId) {
      if (!pubId || !qrContainer) return;
      territory.publicId = pubId;
      const healedUrl = buildPublicTerritoryUrl(congPubId, pubId);
      if (!healedUrl) return;
      qrContainer.setAttribute('data-qr-url', healedUrl);
      renderQrInto(qrContainer, healedUrl);
    }).catch(function (e) {
      console.error('QR auto-heal failed:', e);
    });
  }

  function renderQrInto(containerEl, url) {
    QRCode.toCanvas(url, {
      width: 60,
      margin: 0,
      color: { dark: '#000000', light: '#ffffff' }
    }).then(function (canvas) {
      canvas.style.display = 'block';
      containerEl.innerHTML = '';
      containerEl.appendChild(canvas);
    }).catch(function (err) {
      console.error('QR generation failed:', err);
    });
  }

  function toggleEditMode() {
    editMode = !editMode;
    // Re-render del mapa con editable opcional. La forma simple: destruir y volver a crear.
    if (cardController) cardController.cleanup();
    cardController = renderCardMap(card, territory, globalLandmarks, {
      editable: editMode,
      qrUrl: qrUrlForRender,
      onViewChange: function (v) { pendingView = v; }
    });
    if (editMode) {
      editToggleBtn.textContent = t('card.back');
      saveViewBtn.style.display = '';
      resetViewBtn.style.display = '';
    } else {
      editToggleBtn.textContent = t('card.enableEditView');
      saveViewBtn.style.display = 'none';
      resetViewBtn.style.display = 'none';
    }
  }

  async function saveCurrentView() {
    const view = pendingView || (cardController && cardController.getView());
    if (!view) return;
    saveViewBtn.disabled = true;
    try {
      await store.updateTerritory(territory.id, {
        cardZoom: view.zoom,
        cardCenter: view.center
      });
      // Actualizar territory local
      territory.cardZoom = view.zoom;
      territory.cardCenter = view.center;
      alert(t('card.viewSaved'));
    } catch (e) {
      console.error('Save view failed', e);
    }
    saveViewBtn.disabled = false;
  }

  async function resetView() {
    try {
      await store.updateTerritory(territory.id, {
        cardZoom: null,
        cardCenter: null
      });
      territory.cardZoom = null;
      territory.cardCenter = null;
      if (cardController) cardController.resetView();
    } catch (e) {
      console.error('Reset view failed', e);
    }
  }

  async function shareLink() {
    if (!publicUrl) {
      // Si no hay publicId aún, generarlo
      if (store.ensureTerritoryPublicId) {
        try {
          const newPubId = await store.ensureTerritoryPublicId(territory.id);
          const url = buildPublicTerritoryUrl(congPubId, newPubId);
          const ok = await copyToClipboard(url);
          if (ok) alert(t('share.copied') + '\n\n' + url);
          else prompt(t('share.copyFailed'), url);
          return;
        } catch (e) {
          console.error('ensureTerritoryPublicId failed', e);
        }
      }
      alert(t('share.copyFailed'));
      return;
    }
    const ok = await copyToClipboard(publicUrl);
    if (ok) alert(t('share.copied') + '\n\n' + publicUrl);
    else prompt(t('share.copyFailed'), publicUrl);
  }

  function downloadCard() {
    const cardEl = document.getElementById('territory-card');
    toPng(cardEl, {
      cacheBust: true,
      pixelRatio: 2,
      includeQueryParams: true,
      skipAutoScale: true,
      filter: function () { return true; }
    }).then(function (dataUrl) {
      const link = document.createElement('a');
      link.download = fileName + '.png';
      link.href = dataUrl;
      link.click();
    }).catch(function (err) {
      console.error('Card capture failed:', err);
    });
  }

  return function () {
    if (cardController) cardController.cleanup();
  };
}
