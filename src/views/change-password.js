import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/helpers.js';

export let isDirty = false;

export function render(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-wrapper';

  const card = document.createElement('div');
  card.className = 'auth-card';

  card.innerHTML =
    '<h2>' + escapeHtml(t('auth.changePasswordTitle')) + '</h2>' +
    '<p style="color:var(--text-secondary);margin-bottom:1rem;font-size:0.875rem;">' + escapeHtml(t('auth.changePasswordDesc')) + '</p>' +
    '<div class="flash flash-alert auth-error" style="display:none"></div>' +
    '<form class="auth-form">' +
      '<div class="form-group">' +
        '<label for="new-password">' + escapeHtml(t('auth.newPassword')) + '</label>' +
        '<input type="password" id="new-password" minlength="6" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="confirm-password">' + escapeHtml(t('auth.confirmPassword')) + '</label>' +
        '<input type="password" id="confirm-password" minlength="6" required />' +
      '</div>' +
      '<button type="submit" class="btn btn-primary" style="width:100%">' + escapeHtml(t('auth.changePasswordButton')) + '</button>' +
    '</form>';

  const errorDiv = card.querySelector('.auth-error');
  const form = card.querySelector('.auth-form');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    const newPass = card.querySelector('#new-password').value;
    const confirmPass = card.querySelector('#confirm-password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (newPass !== confirmPass) {
      errorDiv.textContent = t('auth.passwordMismatch');
      errorDiv.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
      const { changePassword } = await import('../firebase/auth.js');
      await changePassword(newPass);
      window.location.hash = '#/';
      window.location.reload();
    } catch (err) {
      errorDiv.textContent = t('auth.changePasswordError');
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = t('auth.changePasswordButton');
    }
  });

  wrapper.appendChild(card);
  container.appendChild(wrapper);

  return null;
}
