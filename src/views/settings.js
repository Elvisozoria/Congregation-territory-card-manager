import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/helpers.js';
import { getMode, setMode, getUserProfile, getStore, migrateLocalToCloud } from '../store/index.js';
import { parseBoundary, parseCoordString } from '../utils/kml-import.js';
import { canEditCongregation } from '../auth/permissions.js';

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

  // Una persona puede llevar los territorios de más de una congregación.
  if (mode === 'online' && profile && profile.congregationId) {
    wrapper.appendChild(buildCongregationSection());
  }

  // Límite de la congregación (offline siempre; online sólo quien puede editar
  // la congregación, porque lo ven todos).
  if (mode === 'offline' || canEditCongregation(profile)) {
    wrapper.appendChild(buildBoundarySection());
  }

  container.appendChild(wrapper);

  return null;
}

function buildCongregationSection() {
  const section = document.createElement('div');
  section.className = 'admin-section';
  section.innerHTML = '<h3>' + escapeHtml(t('settings.congregationTitle')) + '</h3>' +
    '<p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:0.75rem;">' +
    escapeHtml(t('settings.congregationDesc')) + '</p>' +
    '<div class="flash flash-alert cong-error" style="display:none"></div>' +
    '<p class="cong-loading" style="color:var(--text-secondary);">' + escapeHtml(t('admin.loading')) + '</p>';

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;';
  section.appendChild(list);

  function fail(msg) {
    const box = section.querySelector('.cong-error');
    box.textContent = msg;
    box.style.display = 'block';
  }

  (async function () {
    const { listMemberships, switchCongregation } = await import('../firebase/auth.js');
    let items = [];
    try {
      items = await listMemberships();
    } catch (e) {
      fail(t('settings.congregationLoadError'));
    }
    const loading = section.querySelector('.cong-loading');
    if (loading) loading.remove();

    items.forEach(function (m) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:0.75rem;' +
        'padding:0.5rem 0.75rem;border:1px solid var(--border-primary);border-radius:6px;';

      const label = document.createElement('div');
      label.style.cssText = 'flex:1;min-width:0;';
      label.innerHTML = '<strong>' + escapeHtml(m.name || m.congregationId) + '</strong>' +
        '<span style="color:var(--text-secondary);font-size:0.8125rem;margin-left:0.5rem;">' +
        escapeHtml(t('admin.role' + m.role.charAt(0).toUpperCase() + m.role.slice(1))) + '</span>';
      row.appendChild(label);

      if (m.active) {
        const badge = document.createElement('span');
        badge.className = 'status-badge status-active';
        badge.textContent = t('settings.congregationActive');
        row.appendChild(badge);
      } else {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm';
        btn.textContent = t('settings.congregationSwitch');
        btn.addEventListener('click', async function () {
          btn.disabled = true;
          try {
            await switchCongregation(m.congregationId);
            window.location.hash = '#/';
            window.location.reload();
          } catch (e) {
            btn.disabled = false;
            fail(t('settings.congregationSwitchError'));
          }
        });
        row.appendChild(btn);
      }
      list.appendChild(row);
    });

    // Crear otra congregación. Sólo tiene sentido para quien administra: quien
    // es publicador en la suya no anda creando congregaciones.
    const profile = getUserProfile();
    if (profile && profile.role === 'admin') {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary';
      addBtn.style.marginTop = '0.75rem';
      addBtn.textContent = t('settings.congregationCreate');
      addBtn.addEventListener('click', async function () {
        const name = window.prompt(t('settings.congregationPrompt'));
        if (!name || !name.trim()) return;
        addBtn.disabled = true;
        try {
          const { registerCongregation } = await import('../firebase/auth.js');
          await registerCongregation(name.trim());
          window.location.hash = '#/';
          window.location.reload();
        } catch (e) {
          addBtn.disabled = false;
          fail(t('settings.congregationCreateError'));
        }
      });
      section.appendChild(addBtn);
    }
  })();

  return section;
}

function buildBoundarySection() {
  const store = getStore();
  const section = document.createElement('div');
  section.className = 'admin-section';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'boundary-file';
  fileInput.accept = '.kml,.kmz';
  fileInput.style.display = 'none';

  function paint() {
    const boundary = store.getBoundary ? store.getBoundary() : null;
    section.innerHTML = '<h3>' + escapeHtml(t('settings.boundaryTitle')) + '</h3>' +
      '<p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:0.75rem;">' +
      escapeHtml(t('settings.boundaryDesc')) + '</p>' +
      '<div class="flash flash-alert boundary-error" style="display:none"></div>';

    if (boundary) {
      const points = parseCoordString(boundary.coords).length;
      let html = '<p><strong>' + escapeHtml(t('settings.boundaryLoaded')) + ':</strong> ' +
        escapeHtml(boundary.name || '') + ' (' + points + ' ' + escapeHtml(t('settings.boundaryPoints')) + ')</p>';

      if (boundary.updated) {
        html += '<p style="font-size:0.875rem;color:var(--text-secondary);">' +
          escapeHtml(t('settings.boundaryUpdated')) + ': ' + escapeHtml(boundary.updated) + '</p>';
      }

      const b = boundary.borders || {};
      const rows = [
        ['boundaryNorth', b.north], ['boundaryEast', b.east],
        ['boundarySouth', b.south], ['boundaryWest', b.west]
      ].filter(function (r) { return r[1]; });

      if (rows.length > 0) {
        html += '<h4 style="margin:0.75rem 0 0.25rem;">' + escapeHtml(t('settings.boundaryBorders')) + '</h4>' +
          '<dl style="margin:0;font-size:0.875rem;">' +
          rows.map(function (r) {
            return '<dt style="font-weight:600;margin-top:0.35rem;">' + escapeHtml(t('settings.' + r[0])) + '</dt>' +
              '<dd style="margin:0 0 0 0.75rem;white-space:pre-line;color:var(--text-secondary);">' +
              escapeHtml(r[1]) + '</dd>';
          }).join('') + '</dl>';
      }
      section.insertAdjacentHTML('beforeend', html);
    } else {
      section.insertAdjacentHTML('beforeend',
        '<p style="color:var(--text-secondary);">' + escapeHtml(t('settings.boundaryNone')) + '</p>');
    }

    const actions = document.createElement('div');
    actions.style.marginTop = '0.75rem';
    actions.style.display = 'flex';
    actions.style.gap = '0.5rem';
    actions.style.flexWrap = 'wrap';

    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn btn-primary';
    uploadBtn.textContent = boundary ? t('settings.boundaryReplace') : t('settings.boundaryUpload');
    uploadBtn.addEventListener('click', function () { fileInput.click(); });
    actions.appendChild(uploadBtn);

    if (boundary) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-danger';
      removeBtn.textContent = t('settings.boundaryRemove');
      removeBtn.addEventListener('click', async function () {
        if (!window.confirm(t('settings.boundaryConfirmRemove'))) return;
        await store.setBoundary(null);
        paint();
      });
      actions.appendChild(removeBtn);
    }

    section.appendChild(actions);
    section.appendChild(fileInput);
  }

  fileInput.addEventListener('change', async function (e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const boundary = await parseBoundary(file);
      await store.setBoundary(boundary);
      paint();
    } catch (err) {
      const msg = err && err.message === 'boundary.empty'
        ? t('settings.boundaryEmpty')
        : (err && err.message) || '';
      const box = section.querySelector('.boundary-error');
      if (box) {
        box.textContent = t('settings.boundaryError') + msg;
        box.style.display = 'block';
      }
    } finally {
      fileInput.value = '';
    }
  });

  paint();
  return section;
}
