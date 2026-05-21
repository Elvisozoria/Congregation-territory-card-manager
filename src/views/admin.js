import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/helpers.js';
import { getUserProfile } from '../store/index.js';

export let isDirty = false;

export function render(container) {
  const profile = getUserProfile();
  if (!profile || profile.role !== 'admin') {
    container.innerHTML = '<p style="padding:2rem;">' + escapeHtml(t('auth.noPermission')) + '</p><a href="#/" class="btn btn-secondary" style="margin-left:2rem;">' + escapeHtml(t('show.btnBack')) + '</a>';
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.style.maxWidth = '600px';

  // Header
  const header = document.createElement('div');
  header.className = 'header-row';
  header.innerHTML = '<h1>' + escapeHtml(t('admin.title')) + '</h1>' +
    '<a href="#/" class="btn btn-secondary">' + escapeHtml(t('show.btnBack')) + '</a>';
  wrapper.appendChild(header);

  // Congregation info
  const congSection = document.createElement('div');
  congSection.className = 'admin-section';
  congSection.innerHTML = '<h3>' + escapeHtml(t('admin.congregationInfo')) + '</h3>' +
    '<p class="admin-detail"><strong>' + escapeHtml(t('admin.congregationId')) + ':</strong> <code>' + escapeHtml(profile.congregationId) + '</code></p>';
  wrapper.appendChild(congSection);

  // Members list
  const membersSection = document.createElement('div');
  membersSection.className = 'admin-section';
  membersSection.innerHTML = '<h3>' + escapeHtml(t('admin.members')) + '</h3>' +
    '<div class="members-loading">' + escapeHtml(t('admin.loading')) + '</div>';
  wrapper.appendChild(membersSection);

  loadMembers(membersSection, profile.congregationId);

  // Invite user form (Google Auth — invite by email)
  const createSection = document.createElement('div');
  createSection.className = 'admin-section';
  createSection.innerHTML =
    '<h3>' + escapeHtml(t('admin.inviteUser')) + '</h3>' +
    '<p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.75rem;">' + escapeHtml(t('admin.inviteDesc')) + '</p>' +
    '<div class="flash flash-alert admin-error" style="display:none"></div>' +
    '<div class="flash flash-notice admin-success" style="display:none"></div>' +
    '<form class="admin-form">' +
      '<div class="form-group">' +
        '<label for="new-user-email">' + escapeHtml(t('auth.email')) + '</label>' +
        '<input type="email" id="new-user-email" placeholder="usuario@gmail.com" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="new-user-name">' + escapeHtml(t('auth.displayName')) + '</label>' +
        '<input type="text" id="new-user-name" required />' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="new-user-role">' + escapeHtml(t('admin.role')) + '</label>' +
        '<select id="new-user-role">' +
          '<option value="member">' + escapeHtml(t('admin.roleMember')) + '</option>' +
          '<option value="admin">' + escapeHtml(t('admin.roleAdmin')) + '</option>' +
        '</select>' +
      '</div>' +
      '<button type="submit" class="btn btn-primary" style="width:100%">' + escapeHtml(t('admin.inviteButton')) + '</button>' +
    '</form>';

  const errorDiv = createSection.querySelector('.admin-error');
  const successDiv = createSection.querySelector('.admin-success');
  const form = createSection.querySelector('.admin-form');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    const email = createSection.querySelector('#new-user-email').value.trim();
    const displayName = createSection.querySelector('#new-user-name').value.trim();
    const role = createSection.querySelector('#new-user-role').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
      const { inviteMember } = await import('../firebase/auth.js');
      await inviteMember(email, displayName, profile.congregationId, role);

      successDiv.innerHTML =
        '<p><strong>' + escapeHtml(t('admin.inviteSent')) + '</strong></p>' +
        '<div class="credentials-box">' +
          '<p>' + escapeHtml(t('auth.email')) + ': <strong>' + escapeHtml(email) + '</strong></p>' +
        '</div>' +
        '<p style="font-size:0.8125rem;margin-top:0.5rem;">' + escapeHtml(t('admin.inviteInstructions')) + '</p>';
      successDiv.style.display = 'block';

      form.reset();
      loadMembers(membersSection, profile.congregationId);
    } catch (err) {
      errorDiv.textContent = t('admin.createUserError');
      errorDiv.style.display = 'block';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = t('admin.inviteButton');
  });

  wrapper.appendChild(createSection);
  container.appendChild(wrapper);

  return null;
}

async function loadMembers(section, congregationId) {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../firebase/config.js');

    const q = query(collection(db, 'users'), where('congregationId', '==', congregationId));
    const snap = await getDocs(q);

    const membersHtml = section.querySelector('.members-loading');
    if (snap.empty) {
      membersHtml.textContent = t('admin.noMembers');
      return;
    }

    const table = document.createElement('table');
    table.className = 'territory-table';
    table.innerHTML = '<thead><tr><th>' + t('auth.displayName') + '</th><th>' + t('auth.email') + '</th><th>' + t('admin.role') + '</th></tr></thead><tbody></tbody>';

    const tbody = table.querySelector('tbody');
    snap.docs.forEach(function (d) {
      const u = d.data();
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + escapeHtml(u.displayName || '') + '</td>' +
        '<td>' + escapeHtml(u.email || '') + '</td>' +
        '<td><span class="role-badge role-' + (u.role || 'member') + '">' + escapeHtml(u.role || 'member') + '</span></td>';
      tbody.appendChild(tr);
    });

    membersHtml.replaceWith(table);
  } catch (err) {
    console.error('Failed to load members:', err);
    section.querySelector('.members-loading').textContent = t('admin.loadError');
  }
}
