import { toPng } from 'html-to-image';
import { t } from '../i18n/i18n.js';
import { getStore, getUserProfile } from '../store/index.js';
import { renderCardMap } from '../components/card-map.js';
import { escapeHtml } from '../utils/helpers.js';
import { buildPublicTerritoryUrl } from '../utils/public-id.js';
import { canViewPrintAll } from '../auth/permissions.js';

export let isDirty = false;

export function render(container) {
  const store = getStore();
  const profile = getUserProfile();

  if (!canViewPrintAll(profile)) {
    container.innerHTML = '<p style="padding:2rem;">' + escapeHtml(t('auth.noPermission')) + '</p><a href="#/" class="btn btn-secondary" style="margin-left:2rem;">' + escapeHtml(t('print.back')) + '</a>';
    return null;
  }

  const territories = store.getAll();
  const controllers = [];
  const congPubId = store.getCongregationPublicId ? store.getCongregationPublicId() : null;

  document.body.classList.add('print-layout');

  // Controls (no-print)
  const controls = document.createElement('div');
  controls.className = 'no-print';
  controls.style.cssText = 'padding:1.5rem;text-align:center;';
  controls.innerHTML = '<h2 style="font-size:1.25rem;">' + escapeHtml(t('print.title', { count: territories.length })) + '</h2>';

  const btnRow = document.createElement('div');
  btnRow.style.marginTop = '0.5rem';

  const printBtn = document.createElement('a');
  printBtn.href = '#';
  printBtn.className = 'btn btn-primary';
  printBtn.textContent = t('print.printAll');
  printBtn.addEventListener('click', function (e) {
    e.preventDefault();
    window.print();
  });

  const downloadBtn = document.createElement('a');
  downloadBtn.href = '#';
  downloadBtn.className = 'btn btn-primary';
  downloadBtn.textContent = t('print.downloadAll');
  downloadBtn.addEventListener('click', function (e) {
    e.preventDefault();
    downloadBtn.textContent = t('print.downloadAll') + '...';
    setTimeout(function () { downloadAllCards(); }, 500);
  });

  const backBtn = document.createElement('a');
  backBtn.href = '#/';
  backBtn.className = 'btn btn-secondary';
  backBtn.textContent = t('print.back');

  btnRow.appendChild(printBtn);
  btnRow.appendChild(document.createTextNode(' '));
  btnRow.appendChild(downloadBtn);
  btnRow.appendChild(document.createTextNode(' '));
  btnRow.appendChild(backBtn);
  controls.appendChild(btnRow);
  container.appendChild(controls);

  // Cards grid
  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  territories.forEach(function (territory) {
    const publicUrl = (congPubId && territory.publicId) ? buildPublicTerritoryUrl(congPubId, territory.publicId) : '';
    const shouldShowQr = territory.showQr || territory.qr_url;
    const qrUrl = shouldShowQr ? (publicUrl || territory.qr_url || '') : '';

    const card = document.createElement('div');
    card.className = 'territory-card';
    card.id = 'territory-card-' + territory.id;
    card.style.position = 'relative';

    const label = document.createElement('div');
    label.className = 'card-label';
    label.style.cssText = 'position:absolute;top:8px;left:8px;z-index:1000;background:rgba(255,255,255,0.9);padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.875rem;color:#1F2937;';
    label.textContent = territory.number + ' - ' + territory.name;
    card.appendChild(label);

    if (qrUrl) {
      const qrContainer = document.createElement('div');
      qrContainer.className = 'qr-container';
      qrContainer.id = 'qr-' + territory.id;
      qrContainer.style.cssText = 'position:absolute;bottom:8px;right:8px;z-index:1000;background:white;padding:4px;';
      qrContainer.setAttribute('data-qr-url', qrUrl);
      card.appendChild(qrContainer);
    }

    const mapDiv = document.createElement('div');
    mapDiv.className = 'card-map';
    card.appendChild(mapDiv);

    grid.appendChild(card);
    const globalLandmarks = store.getGlobalLandmarks ? store.getGlobalLandmarks() : [];
    const controller = renderCardMap(card, territory, globalLandmarks, { editable: false, qrUrl: qrUrl });
    controllers.push(controller);
  });

  container.appendChild(grid);

  function downloadAllCards() {
    const cards = document.querySelectorAll('.territory-card');
    let i = 0;

    function downloadNext() {
      if (i >= cards.length) return;
      const card = cards[i];
      toPng(card, { cacheBust: true, pixelRatio: 2, quality: 1 }).then(function (dataUrl) {
        const link = document.createElement('a');
        const label = card.querySelector('.card-label').textContent.trim().toLowerCase().replace(/\s+/g, '-');
        link.download = label + '.png';
        link.href = dataUrl;
        link.click();
      }).catch(function (err) {
        console.error('Failed to render card ' + i + ':', err);
      }).then(function () {
        i++;
        setTimeout(downloadNext, 500);
      });
    }

    downloadNext();
  }

  return function () {
    document.body.classList.remove('print-layout');
    controllers.forEach(function (c) { if (c && c.cleanup) c.cleanup(); });
  };
}
