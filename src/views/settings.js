import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/helpers.js';
import { getMode, setMode, getUserProfile, migrateLocalToCloud } from '../store/index.js';

export let isDirty = false;

export function render(container) {
  const mode = getMode();
  const profile = getUserProfile();

  const wrapper = document.createElement('div');
  wrapper.style.maxWidth = '600px';

  // Header
  const header = document.createElement('div');
  header.className = 'header-row';
  header.innerHTML = '<h1>' + escapeHtml(t('settings.title')) + '</h1>' +
    '<a href="#/" class="btn btn-secondary">' + escapeHtml(t('show.btnBack')) + '</a>';
  wrapper.appendChild(header);

  // Current mode info
  const modeSection = document.createElement('div');
  modeSection.className = 'admin-section';
  const modeLabel = mode === 'online' ? t('settings.modeOnline') : t('settings.modeOffline');
  modeSection.innerHTML = '<h3>' + escapeHtml(t('settings.currentMode')) + '</h3>' +
    '<p>' + escapeHtml(modeLabel) + '</p>';

  if (mode === 'offline') {
    const switchBtn = document.createElement('button');
    switchBtn.className = 'btn btn-primary';
    switchBtn.style.marginTop = '0.5rem';
    switchBtn.textContent = t('settings.switchToOnline');
    switchBtn.addEventListener('click', function () {
      setMode('online');
      window.location.hash = '#/register';
      window.location.reload();
    });
    modeSection.appendChild(switchBtn);
  }

  wrapper.appendChild(modeSection);

  // Online-only: user profile info
  if (mode === 'online' && profile) {
    const profileSection = document.createElement('div');
    profileSection.className = 'admin-section';
    profileSection.innerHTML =
      '<h3>' + escapeHtml(t('settings.profile')) + '</h3>' +
      '<p><strong>' + escapeHtml(t('auth.displayName')) + ':</strong> ' + escapeHtml(profile.displayName || '') + '</p>' +
      '<p><strong>' + escapeHtml(t('auth.email')) + ':</strong> ' + escapeHtml(profile.email || '') + '</p>' +
      '<p><strong>' + escapeHtml(t('admin.role')) + ':</strong> ' + escapeHtml(profile.role || '') + '</p>';
    wrapper.appendChild(profileSection);

    // Change password
    const passSection = document.createElement('div');
    passSection.className = 'admin-section';
    passSection.innerHTML =
      '<h3>' + escapeHtml(t('auth.changePasswordTitle')) + '</h3>' +
      '<div class="flash flash-alert pass-error" style="display:none"></div>' +
      '<div class="flash flash-notice pass-success" style="display:none"></div>' +
      '<form class="admin-form">' +
        '<div class="form-group">' +
          '<label for="settings-new-pass">' + escapeHtml(t('auth.newPassword')) + '</label>' +
          '<input type="password" id="settings-new-pass" minlength="6" required />' +
        '</div>' +
        '<div class="form-group">' +
          '<label for="settings-confirm-pass">' + escapeHtml(t('auth.confirmPassword')) + '</label>' +
          '<input type="password" id="settings-confirm-pass" minlength="6" required />' +
        '</div>' +
        '<button type="submit" class="btn btn-secondary">' + escapeHtml(t('auth.changePasswordButton')) + '</button>' +
      '</form>';

    const passForm = passSection.querySelector('.admin-form');
    const passError = passSection.querySelector('.pass-error');
    const passSuccess = passSection.querySelector('.pass-success');

    passForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      passError.style.display = 'none';
      passSuccess.style.display = 'none';

      const newPass = passSection.querySelector('#settings-new-pass').value;
      const confirmPass = passSection.querySelector('#settings-confirm-pass').value;

      if (newPass !== confirmPass) {
        passError.textContent = t('auth.passwordMismatch');
        passError.style.display = 'block';
        return;
      }

      try {
        const { changePassword } = await import('../firebase/auth.js');
        await changePassword(newPass);
        passSuccess.textContent = t('settings.passwordChanged');
        passSuccess.style.display = 'block';
        passForm.reset();
      } catch (err) {
        passError.textContent = t('auth.changePasswordError');
        passError.style.display = 'block';
      }
    });

    wrapper.appendChild(passSection);

    // Logout
    const logoutSection = document.createElement('div');
    logoutSection.className = 'admin-section';
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-danger';
    logoutBtn.textContent = t('settings.logout');
    logoutBtn.addEventListener('click', async function () {
      const { signOut } = await import('../firebase/auth.js');
      await signOut();
      window.location.hash = '#/login';
      window.location.reload();
    });
    logoutSection.appendChild(logoutBtn);
    wrapper.appendChild(logoutSection);
  }

  // Online user: switch back to offline
  if (mode === 'online' && profile) {
    const switchOfflineSection = document.createElement('div');
    switchOfflineSection.className = 'admin-section';
    const switchOfflineBtn = document.createElement('button');
    switchOfflineBtn.className = 'btn btn-secondary';
    switchOfflineBtn.textContent = t('settings.switchToOffline');
    switchOfflineBtn.addEventListener('click', function () {
      setMode('offline');
      window.location.hash = '#/';
      window.location.reload();
    });
    switchOfflineSection.appendChild(switchOfflineBtn);
    wrapper.appendChild(switchOfflineSection);
  }

  // Migration section (offline mode with data)
  if (mode === 'offline') {
    const migrateSection = document.createElement('div');
    migrateSection.className = 'admin-section';
    migrateSection.innerHTML = '<h3>' + escapeHtml(t('settings.migrateTitle')) + '</h3>' +
      '<p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:0.75rem;">' + escapeHtml(t('settings.migrateDesc')) + '</p>';

    const migrateBtn = document.createElement('button');
    migrateBtn.className = 'btn btn-primary';
    migrateBtn.textContent = t('settings.migrateButton');
    migrateBtn.addEventListener('click', function () {
      setMode('online');
      window.location.hash = '#/register';
      window.location.reload();
    });
    migrateSection.appendChild(migrateBtn);
    wrapper.appendChild(migrateSection);
  }

  container.appendChild(wrapper);

  return null;
}
