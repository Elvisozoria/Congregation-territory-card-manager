import { t } from '../i18n/i18n.js';
import { escapeHtml } from '../utils/helpers.js';
import { getUserProfile } from '../store/index.js';

export let isDirty = false;

const ROLE_OPTIONS = ['admin', 'conductor', 'publisher'];

function roleLabel(role) {
  if (role === 'admin') return t('admin.roleAdmin');
  if (role === 'conductor') return t('admin.roleConductor');
  if (role === 'publisher') return t('admin.rolePublisher');
  if (role === 'member') return t('admin.roleMember');
  return role || '—';
}

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

  loadMembers(membersSection, profile);

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
          '<option value="publisher">' + escapeHtml(t('admin.rolePublisher')) + '</option>' +
          '<option value="conductor">' + escapeHtml(t('admin.roleConductor')) + '</option>' +
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
      loadMembers(membersSection, profile);
    } catch (err) {
      errorDiv.textContent = t('admin.createUserError');
      errorDiv.style.display = 'block';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = t('admin.inviteButton');
  });

  wrapper.appendChild(createSection);

  // Migration section (lazy — solo se muestra si hay 'member' legacy)
  const migrateSection = document.createElement('div');
  migrateSection.className = 'admin-section';
  migrateSection.style.display = 'none';
  migrateSection.innerHTML =
    '<h3>' + escapeHtml(t('admin.migrateMembers')) + '</h3>' +
    '<div class="flash flash-notice migrate-result" style="display:none"></div>' +
    '<button class="btn btn-secondary migrate-btn">' + escapeHtml(t('admin.migrateMembers')) + '</button>';
  wrapper.appendChild(migrateSection);

  container.appendChild(wrapper);

  // Detectar legacy members para mostrar el botón
  detectLegacyMembers(migrateSection, profile, membersSection);

  return null;
}

async function loadMembers(section, currentProfile) {
  try {
    const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../firebase/config.js');

    const q = query(collection(db, 'users'), where('congregationId', '==', currentProfile.congregationId));
    const snap = await getDocs(q);

    const loadingEl = section.querySelector('.members-loading');
    if (snap.empty) {
      loadingEl.textContent = t('admin.noMembers');
      return;
    }

    const table = document.createElement('table');
    table.className = 'territory-table';
    table.innerHTML = '<thead><tr><th>' + escapeHtml(t('auth.displayName')) + '</th><th>' + escapeHtml(t('auth.email')) + '</th><th>' + escapeHtml(t('admin.role')) + '</th><th></th></tr></thead><tbody></tbody>';

    const tbody = table.querySelector('tbody');
    snap.docs.forEach(function (d) {
      const u = d.data();
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = u.displayName || '';

      const tdEmail = document.createElement('td');
      tdEmail.textContent = u.email || '';

      const tdRole = document.createElement('td');
      const roleBadge = document.createElement('span');
      roleBadge.className = 'role-badge role-' + (u.role || 'conductor');
      roleBadge.textContent = roleLabel(u.role);
      tdRole.appendChild(roleBadge);

      const tdActions = document.createElement('td');
      tdActions.className = 'actions';

      if (d.id !== currentProfile.uid) {
        const select = document.createElement('select');
        select.className = 'role-select';
        ROLE_OPTIONS.forEach(function (r) {
          const opt = document.createElement('option');
          opt.value = r;
          opt.textContent = roleLabel(r);
          if (r === (u.role === 'member' ? 'conductor' : u.role)) opt.selected = true;
          select.appendChild(opt);
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-secondary btn-sm';
        saveBtn.textContent = t('admin.changeRole');
        saveBtn.addEventListener('click', async function () {
          const newRole = select.value;
          if (newRole === u.role) return;
          saveBtn.disabled = true;
          try {
            await updateDoc(doc(db, 'users', d.id), { role: newRole });
            roleBadge.className = 'role-badge role-' + newRole;
            roleBadge.textContent = roleLabel(newRole);
          } catch (err) {
            alert(t('admin.changeRoleError'));
          }
          saveBtn.disabled = false;
        });
        tdActions.appendChild(select);
        tdActions.appendChild(saveBtn);
      } else {
        const youLabel = document.createElement('span');
        youLabel.style.cssText = 'font-size:0.75rem;color:var(--text-secondary);';
        youLabel.textContent = '(' + t('admin.youCannotChangeOwnRole').split('.')[0] + ')';
        tdActions.appendChild(youLabel);
      }

      tr.appendChild(tdName);
      tr.appendChild(tdEmail);
      tr.appendChild(tdRole);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });

    loadingEl.replaceWith(table);
  } catch (err) {
    console.error('Failed to load members:', err);
    section.querySelector('.members-loading').textContent = t('admin.loadError');
  }
}

async function detectLegacyMembers(migrateSection, profile, membersSection) {
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../firebase/config.js');
    const q = query(collection(db, 'users'),
      where('congregationId', '==', profile.congregationId),
      where('role', '==', 'member')
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    migrateSection.style.display = '';
    const resultDiv = migrateSection.querySelector('.migrate-result');
    const btn = migrateSection.querySelector('.migrate-btn');

    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        const { migrateMembersToConductors } = await import('../firebase/migrations.js');
        const result = await migrateMembersToConductors(profile.congregationId);
        resultDiv.textContent = result.updated > 0
          ? t('admin.migrateMembersDone', { count: result.updated })
          : t('admin.migrateMembersNone');
        resultDiv.style.display = 'block';
        migrateSection.style.display = 'none';
        loadMembers(membersSection, profile);
      } catch (err) {
        console.error('Migration error:', err);
        alert(t('admin.changeRoleError'));
      }
      btn.disabled = false;
    });
  } catch (err) {
    console.error('Failed to detect legacy members:', err);
  }
}
