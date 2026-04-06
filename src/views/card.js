import html2canvas from 'html2canvas';
import { t } from '../i18n/i18n.js';
import { getStore } from '../store/index.js';
import { renderCardMap } from '../components/card-map.js';
import { escapeHtml } from '../utils/helpers.js';

export let isDirty = false;

export function render(container, params) {
  const store = getStore();
  const territory = store.getById(params.id);
  if (!territory) {
    container.innerHTML = '<p>' + escapeHtml(t('alert.notFound')) + '</p><a href="#/" class="btn btn-secondary">' + escapeHtml(t('card.back')) + '</a>';
    return null;
  }

  let cleanup = null;
  const qrUrl = territory.qr_url || '';
  const fileName = territory.number + '-' + territory.name.toLowerCase().replace(/\s+/g, '-');

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

  const backBtn = document.createElement('a');
  backBtn.href = '#/territories/' + territory.id;
  backBtn.className = 'btn btn-secondary btn-sm';
  backBtn.textContent = t('card.back');

  controls.appendChild(downloadBtn);
  controls.appendChild(printBtn);
  controls.appendChild(backBtn);
  wrapper.appendChild(controls);

  // Card
  const card = document.createElement('div');
  card.id = 'territory-card';
  card.className = 'territory-card';

  const label = document.createElement('div');
  label.className = 'card-label';
  label.style.cssText = 'position:absolute;top:8px;left:8px;z-index:1000;background:rgba(255,255,255,0.9);padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.875rem;';
  label.textContent = territory.number + ' - ' + territory.name;
  card.appendChild(label);

  if (qrUrl) {
    const qrContainer = document.createElement('div');
    qrContainer.className = 'qr-container';
    qrContainer.style.cssText = 'position:absolute;bottom:8px;right:8px;z-index:1000;background:white;padding:4px;';
    qrContainer.setAttribute('data-qr-url', qrUrl);
    card.appendChild(qrContainer);
  }

  const mapDiv = document.createElement('div');
  mapDiv.className = 'card-map';
  card.appendChild(mapDiv);

  card.style.position = 'relative';
  wrapper.appendChild(card);
  container.appendChild(wrapper);

  cleanup = renderCardMap(card, territory);

  function downloadCard() {
    html2canvas(document.getElementById('territory-card'), { scale: 2, useCORS: true }).then(function (canvas) {
      const link = document.createElement('a');
      link.download = fileName + '.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  }

  return function () {
    if (cleanup) cleanup();
  };
}
