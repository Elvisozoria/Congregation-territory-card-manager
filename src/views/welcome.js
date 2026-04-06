import { t } from '../i18n/i18n.js';
import { setMode } from '../store/index.js';

export let isDirty = false;

export function render(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'welcome-screen mode-select';

  wrapper.innerHTML =
    '<div class="welcome-icon">' +
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>' +
    '</div>' +
    '<h2>' + t('modeSelect.title') + '</h2>' +
    '<p>' + t('modeSelect.subtitle') + '</p>';

  const options = document.createElement('div');
  options.className = 'mode-options';

  // Offline option
  const offlineCard = document.createElement('div');
  offlineCard.className = 'mode-card';
  offlineCard.innerHTML =
    '<div class="mode-card-icon">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' +
    '</div>' +
    '<h3>' + t('modeSelect.offlineTitle') + '</h3>' +
    '<p>' + t('modeSelect.offlineDesc') + '</p>';
  offlineCard.addEventListener('click', function () {
    setMode('offline');
    window.location.hash = '#/';
    window.location.reload();
  });

  // Online option
  const onlineCard = document.createElement('div');
  onlineCard.className = 'mode-card';
  onlineCard.innerHTML =
    '<div class="mode-card-icon accent">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>' +
    '</div>' +
    '<h3>' + t('modeSelect.onlineTitle') + '</h3>' +
    '<p>' + t('modeSelect.onlineDesc') + '</p>';
  onlineCard.addEventListener('click', function () {
    setMode('online');
    window.location.hash = '#/login';
    window.location.reload();
  });

  options.appendChild(offlineCard);
  options.appendChild(onlineCard);
  wrapper.appendChild(options);
  container.appendChild(wrapper);

  return null;
}
