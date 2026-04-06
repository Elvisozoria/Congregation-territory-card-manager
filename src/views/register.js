import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/helpers.js';

export let isDirty = false;

export function render(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-wrapper';

  const card = document.createElement('div');
  card.className = 'auth-card';

  card.innerHTML =
    '<h2>' + escapeHtml(t('auth.registerTitle')) + '</h2>' +
    '<div class="flash flash-alert auth-error" style="display:none"></div>' +
    '<form class="auth-form">' +
      '<div class="form-group">' +
        '<label for="reg-congregation">' + escapeHtml(t('auth.congregationName')) + '</label>' +
        '<input type="text" id="reg-congregation" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="reg-name">' + escapeHtml(t('auth.displayName')) + '</label>' +
        '<input type="text" id="reg-name" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="reg-email">' + escapeHtml(t('auth.email')) + '</label>' +
        '<input type="email" id="reg-email" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="reg-password">' + escapeHtml(t('auth.password')) + '</label>' +
        '<input type="password" id="reg-password" minlength="6" required />' +
      '</div>' +
      '<button type="submit" class="btn btn-primary" style="width:100%">' + escapeHtml(t('auth.registerButton')) + '</button>' +
    '</form>' +
    '<div class="auth-links">' +
      '<a href="#/login">' + escapeHtml(t('auth.loginLink')) + '</a>' +
    '</div>';

  const errorDiv = card.querySelector('.auth-error');
  const form = card.querySelector('.auth-form');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    const congregationName = card.querySelector('#reg-congregation').value.trim();
    const displayName = card.querySelector('#reg-name').value.trim();
    const email = card.querySelector('#reg-email').value.trim();
    const password = card.querySelector('#reg-password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
      const { registerCongregation } = await import('../firebase/auth.js');
      await registerCongregation(email, password, displayName, congregationName);
      window.location.reload();
    } catch (err) {
      let msg = t('auth.registerError');
      if (err.code === 'auth/email-already-in-use') msg = t('auth.emailInUse');
      if (err.code === 'auth/weak-password') msg = t('auth.weakPassword');
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = t('auth.registerButton');
    }
  });

  wrapper.appendChild(card);
  container.appendChild(wrapper);

  return null;
}
