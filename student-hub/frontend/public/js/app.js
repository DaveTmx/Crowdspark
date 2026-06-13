// frontend/js/app.js
// Main application controller.
// Handles authentication state, page routing, and all dynamic rendering.
// RBAC: The server is the true authority — the UI just hides options the
// current role cannot access, making the UX cleaner.

// ── State ─────────────────────────────────────────────────────────────────────
let currentUser = null;
let activeFilter = '';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const stored = getUser();
  const token  = getToken();

  if (stored && token) {
    currentUser = stored;
    bootApp();
  } else {
    document.getElementById('authOverlay').classList.remove('hidden');
  }

  // Wire up filter chips
  document.getElementById('filterChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#filterChips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.type;
    loadResources();
  });
});

// ── Auth tab switching ─────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById('loginForm').classList.toggle('hidden',    tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  clearMessages();
}

function clearMessages() {
  ['loginError','regError','regSuccess','uploadError','uploadSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// ── Login ──────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');
  const errEl    = document.getElementById('loginError');

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  errEl.textContent = '';

  try {
    const data = await Auth.login(email, password);
    currentUser = data.user;
    bootApp();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

// ── Register ───────────────────────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const btn      = document.getElementById('regBtn');
  const errEl    = document.getElementById('regError');
  const okEl     = document.getElementById('regSuccess');

  btn.disabled = true;
  btn.textContent = 'Creating account…';
  errEl.textContent = '';
  okEl.textContent  = '';

  try {
    const data = await Auth.register(name, email, password);
    okEl.textContent = data.message;
    e.target.reset();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// ── Boot app after successful auth ─────────────────────────────────────────────
function bootApp() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');

  // Populate top bar
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('topAvatar').textContent = initials;
  document.getElementById('topName').textContent   = currentUser.name;

  const roleEl = document.getElementById('topRole');
  roleEl.textContent = currentUser.role;
  roleEl.className   = `role-badge role-${currentUser.role}`;

  // Show / hide nav sections based on role
  const canUpload = ['uploader', 'admin'].includes(currentUser.role);
  const isAdmin   = currentUser.role === 'admin';
  document.getElementById('uploaderNav').style.display = canUpload ? '' : 'none';
  document.getElementById('adminNav').style.display    = isAdmin   ? '' : 'none';

  showPage('browse');
}

// ── Logout ─────────────────────────────────────────────────────────────────────
function logout() {
  Auth.logout();
  currentUser = null;
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('authOverlay').classList.remove('hidden');
  document.getElementById('loginForm').reset();
}

// ── Page routing ───────────────────────────────────────────────────────────────
function showPage(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Deactivate all nav links
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  // Show target page
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  // Activate matching nav link
  const navEl = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  // Load page data
  if (page === 'browse')    loadResources();
  if (page === 'myuploads') loadMyUploads();
  if (page === 'users')     loadUsers();
  if (page === 'audit')     loadAuditLog();
}

// ── BROWSE PAGE ────────────────────────────────────────────────────────────────
async function loadResources() {
  const q      = (document.getElementById('searchQ').value || '').trim();
  const params = { q, type: activeFilter, limit: 50 };

  try {
    const data = await Resources.list(params);
    renderResourceGrid('resourceGrid', data.resources, false);
    renderStats(data);
  } catch (err) {
    document.getElementById('resourceGrid').innerHTML =
      `<div class="empty-state">Failed to load resources: ${err.message}</div>`;
  }
}

function renderStats(data) {
  const resources = data.resources || [];
  const totalDl   = resources.reduce((a, r) => a + (r.download_count || 0), 0);
  const courses   = new Set(resources.map(r => r.course).filter(Boolean)).size;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Resources</div><div class="stat-value">${data.total ?? resources.length}</div></div>
    <div class="stat-card"><div class="stat-label">Total Downloads</div><div class="stat-value">${totalDl.toLocaleString()}</div></div>
    <div class="stat-card"><div class="stat-label">Courses</div><div class="stat-value">${courses}</div></div>
    <div class="stat-card"><div class="stat-label">Your Role</div><div class="stat-value" style="font-size:13px;padding-top:5px"><span class="role-badge role-${currentUser.role}">${currentUser.role}</span></div></div>
  `;
}

function renderResourceGrid(containerId, resources, ownOnly) {
  const container = document.getElementById(containerId);

  if (!resources || !resources.length) {
    container.innerHTML = '<div class="empty-state">No resources found.</div>';
    return;
  }

  const isAdmin   = currentUser.role === 'admin';
  const isUploader = currentUser.role === 'uploader';

  container.innerHTML = resources.map(r => {
    const tagClass  = 'tag-' + (r.type || 'Other').replace(' ', '-');
    const initials  = (r.uploader_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const fileSize  = r.file_size ? formatBytes(r.file_size) : '—';
    const canEdit   = isAdmin || (isUploader && r.uploader_id === currentUser.id);
    const date      = r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';

    return `
      <div class="res-card">
        <div class="res-top">
          <span class="type-tag ${tagClass}">${r.type || 'Other'}</span>
          <span class="res-size">${fileSize}</span>
        </div>
        <div class="res-title">${esc(r.title)}</div>
        <div class="res-course">${esc(r.course || 'General')}</div>
        <div class="res-desc">${esc(r.description || '')}</div>
        <div class="res-meta">
          <div class="res-uploader">
            <div class="mini-av">${initials}</div>
            ${esc((r.uploader_name || '').split(' ')[0])}
          </div>
          <span>${date} · ${r.download_count || 0} dl</span>
        </div>
        <div class="res-actions">
          <button class="btn-secondary btn-sm" onclick="downloadResource('${r.id}', '${esc(r.title)}')">Download</button>
          ${canEdit ? `
            <button class="btn-secondary btn-sm" onclick="editResource('${r.id}', '${esc(r.title)}')">Edit</button>
            <button class="btn-secondary btn-sm btn-danger" onclick="deleteResource('${r.id}', '${esc(r.title)}')">Delete</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── MY UPLOADS ─────────────────────────────────────────────────────────────────
async function loadMyUploads() {
  const grid = document.getElementById('myGrid');
  grid.innerHTML = '<div class="loading">Loading…</div>';

  try {
    const data = await Resources.list({ limit: 100 });
    const mine = (data.resources || []).filter(r => r.uploader_id === currentUser.id);
    renderResourceGrid('myGrid', mine, true);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

// ── UPLOAD PAGE ────────────────────────────────────────────────────────────────
function updateFileLabel(input) {
  const label = document.getElementById('fileLabel');
  label.textContent = input.files[0] ? input.files[0].name : 'Click or drag a file here';
}

async function handleUpload(e) {
  e.preventDefault();
  const title   = document.getElementById('upTitle').value.trim();
  const course  = document.getElementById('upCourse').value.trim();
  const type    = document.getElementById('upType').value;
  const desc    = document.getElementById('upDesc').value.trim();
  const fileEl  = document.getElementById('upFile');
  const errEl   = document.getElementById('uploadError');
  const okEl    = document.getElementById('uploadSuccess');
  const btn     = document.getElementById('uploadBtn');

  errEl.textContent = '';
  okEl.textContent  = '';

  if (!title) { errEl.textContent = 'Title is required.'; return; }

  const formData = new FormData();
  formData.append('title',       title);
  formData.append('course',      course);
  formData.append('type',        type);
  formData.append('description', desc);
  if (fileEl.files[0]) formData.append('file', fileEl.files[0]);

  btn.disabled = true;
  btn.textContent = 'Publishing…';

  try {
    await Resources.create(formData);
    okEl.textContent = 'Resource published successfully!';
    e.target.reset();
    document.getElementById('fileLabel').textContent = 'Click or drag a file here';
    showToast('Resource published!', 'success');
    setTimeout(() => showPage('browse'), 1500);
  } catch (err) {
    errEl.textContent = err.message;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publish Resource';
  }
}

// ── Resource actions ───────────────────────────────────────────────────────────
async function downloadResource(id, title) {
  try {
    await Resources.download(id);
    showToast(`Download started: ${title}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function editResource(id, title) {
  openModal(
    `Edit: ${title}`,
    `<p style="font-size:13px;color:var(--text2);margin-bottom:.75rem">Update the resource details below.</p>
    <div class="field" style="margin-bottom:.75rem">
      <label>New Title</label>
      <input type="text" id="editTitle" value="${title}" />
    </div>`,
    async () => {
      const newTitle = document.getElementById('editTitle').value.trim();
      if (!newTitle) return;
      try {
        await Resources.update(id, { title: newTitle });
        showToast('Resource updated.', 'success');
        loadResources();
        loadMyUploads();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  );
}

function deleteResource(id, title) {
  openModal(
    'Delete resource?',
    `<p style="font-size:13px;color:var(--text2)">Are you sure you want to permanently delete <strong>${esc(title)}</strong>? This cannot be undone.</p>`,
    async () => {
      try {
        await Resources.remove(id);
        showToast('Resource deleted.', 'success');
        loadResources();
        loadMyUploads();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  );
}

// ── USERS PAGE ─────────────────────────────────────────────────────────────────
async function loadUsers() {
  const container = document.getElementById('usersTable');
  container.innerHTML = '<div class="loading">Loading users…</div>';

  try {
    const data = await Users.list();
    renderUsersTable(data.users || []);
  } catch (err) {
    container.innerHTML = `<div class="loading">${err.message}</div>`;
  }
}

function renderUsersTable(users) {
  if (!users.length) {
    document.getElementById('usersTable').innerHTML = '<div class="loading">No users found.</div>';
    return;
  }

  const rows = users.map(u => {
    const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const isSelf   = u.id === currentUser.id;

    return `
      <tr>
        <td>
          <div class="ua-cell">
            <div class="ua-av">${initials}</div>
            <div>
              <div class="ua-name">${esc(u.name)} ${isSelf ? '<span style="font-size:10px;color:var(--text3)">(you)</span>' : ''}</div>
              <div class="ua-email">${esc(u.email)}</div>
            </div>
          </div>
        </td>
        <td><span class="role-badge role-${u.role}">${u.role}</span></td>
        <td><span class="type-tag status-${u.status}">${u.status}</span></td>
        <td>${u.upload_count || 0}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn-secondary btn-sm" onclick="changeUserRole('${u.id}', '${u.name}', '${u.role}')">Change Role</button>
            ${u.status === 'pending' ? `<button class="btn-primary btn-sm" onclick="approveUser('${u.id}', '${esc(u.name)}')">Approve</button>` : ''}
            ${u.status === 'active' && !isSelf ? `<button class="btn-secondary btn-sm btn-danger" onclick="suspendUser('${u.id}', '${esc(u.name)}')">Suspend</button>` : ''}
            ${u.status === 'suspended' ? `<button class="btn-secondary btn-sm" onclick="reactivateUser('${u.id}', '${esc(u.name)}')">Reactivate</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('usersTable').innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Role</th>
          <th>Status</th>
          <th>Uploads</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function changeUserRole(userId, userName, currentRole) {
  const roles = ['viewer', 'uploader', 'admin'];
  openModal(
    `Change role: ${userName}`,
    `<p style="font-size:13px;color:var(--text2);margin-bottom:.75rem">Select the new role for this user.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${roles.map(r => `
        <button class="chip role-pick ${r === currentRole ? 'active' : ''}"
          data-role="${r}"
          onclick="document.querySelectorAll('.role-pick').forEach(b=>b.classList.remove('active'));this.classList.add('active')">
          ${r}
        </button>`).join('')}
    </div>`,
    async () => {
      const picked = document.querySelector('.role-pick.active');
      if (!picked) return;
      const newRole = picked.dataset.role;
      try {
        await Users.changeRole(userId, newRole);
        showToast(`${userName} is now a ${newRole}.`, 'success');
        loadUsers();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  );
}

async function approveUser(userId, name) {
  try {
    await Users.changeStatus(userId, 'active');
    showToast(`${name} approved.`, 'success');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function suspendUser(userId, name) {
  openModal(
    'Suspend account?',
    `<p style="font-size:13px;color:var(--text2)">Suspend <strong>${name}</strong>? They will not be able to log in until reactivated.</p>`,
    async () => {
      try {
        await Users.changeStatus(userId, 'suspended');
        showToast(`${name} suspended.`, 'success');
        loadUsers();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  );
}

async function reactivateUser(userId, name) {
  try {
    await Users.changeStatus(userId, 'active');
    showToast(`${name} reactivated.`, 'success');
    loadUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── AUDIT LOG PAGE ─────────────────────────────────────────────────────────────
async function loadAuditLog() {
  const container = document.getElementById('auditTable');
  container.innerHTML = '<div class="loading">Loading audit log…</div>';

  try {
    const data = await Users.auditLog();
    const log  = data.log || [];

    if (!log.length) {
      container.innerHTML = '<div class="loading">No audit events recorded yet.</div>';
      return;
    }

    const rows = log.map(entry => {
      const date = new Date(entry.created_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const details = entry.details ? JSON.stringify(entry.details) : '—';
      return `
        <tr>
          <td style="white-space:nowrap">${date}</td>
          <td>${esc(entry.actor_name || 'System')}</td>
          <td><code style="font-family:'DM Mono',monospace;font-size:11px">${esc(entry.action)}</code></td>
          <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text3)">${esc(details)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Date</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = `<div class="loading">${err.message}</div>`;
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML    = bodyHTML;
  document.getElementById('modalConfirm').onclick   = () => { onConfirm(); closeModal(); };
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className   = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
