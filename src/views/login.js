import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/helpers.js';
import { setMode } from '../store/index.js';

export let isDirty = false;

export function render(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-wrapper';

  const card = document.createElement('div');
  card.className = 'auth-card';

  card.innerHTML =
    '<h2>' + escapeHtml(t('auth.loginTitle')) + '</h2>' +
    '<div class="flash flash-alert auth-error" style="display:none"></div>' +
    '<form class="auth-form">' +
      '<div class="form-group">' +
        '<label for="login-email">' + escapeHtml(t('auth.email')) + '</label>' +
        '<input type="email" id="login-email" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="login-password">' + escapeHtml(t('auth.password')) + '</label>' +
        '<input type="password" id="login-password" required />' +
      '</div>' +
      '<button type="submit" class="btn btn-primary" style="width:100%">' + escapeHtml(t('auth.loginButton')) + '</button>' +
    '</form>' +
    '<div class="auth-links">' +
      '<a href="#/register">' + escapeHtml(t('auth.registerLink')) + '</a>' +
      '<button class="auth-offline-link">' + escapeHtml(t('auth.useOffline')) + '</button>' +
    '</div>';

  const errorDiv = card.querySelector('.auth-error');
  const form = card.querySelector('.auth-form');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    const email = card.querySelector('#login-email').value.trim();
    const password = card.querySelector('#login-password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
      const { signIn, getCurrentUserProfile } = await import('../firebase/auth.js');
      await signIn(email, password);
      const profile = await getCurrentUserProfile();

      if (profile && profile.mustChangePassword) {
        window.location.hash = '#/change-password';
      } else {
        window.location.reload();
      }
    } catch (err) {
      errorDiv.textContent = t('auth.loginError');
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = t('auth.loginButton');
    }
  });

  card.querySelector('.auth-offline-link').addEventListener('click', function () {
    setMode('offline');
    window.location.hash = '#/';
    window.location.reload();
  });

  wrapper.appendChild(card);
  container.appendChild(wrapper);

  return null;
}
