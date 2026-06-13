// app.js

const API_URL = 'http://localhost:3000/api/projects';

// DOM refs
const form          = document.getElementById('crud-form');
const submitButton  = document.getElementById('submit-button');
const cancelButton  = document.getElementById('cancel-button');
const tableBody     = document.getElementById('projects-table-body');
const projectIdField = document.getElementById('project-id');
const formHeading   = document.getElementById('form-heading');
const formMessage   = document.getElementById('form-message');

// ── Show a message below the form ────────────────────────────────────────────
function showMessage(text, type /* 'success' | 'error' */) {
  formMessage.textContent = text;
  formMessage.className   = type === 'success' ? 'msg-success' : 'msg-error';
  formMessage.style.display = 'block';
  setTimeout(() => { formMessage.style.display = 'none'; }, 4000);
}

// ── Fetch all projects and refresh the table ──────────────────────────────────
async function fetchProjects() {
  tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#667eea;padding:20px;">Loading\u2026</td></tr>';
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Server returned ' + res.status);
    const projects = await res.json();
    renderProjects(projects);
  } catch (err) {
    console.error('Fetch error:', err);
    tableBody.innerHTML =
      '<tr><td colspan="8" style="color:#dc3545;padding:16px;">&#x26A0; Could not load projects. Is the backend server running?</td></tr>';
  }
}

// ── Render rows ───────────────────────────────────────────────────────────────
function renderProjects(projects) {
  if (projects.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" style="padding:16px;color:#888;">No projects yet. Add one above!</td></tr>';
    return;
  }
  tableBody.innerHTML = projects.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${escapeHtml(p.project_title)}</td>
      <td>${escapeHtml(p.student_name  || '—')}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>${p.grade_level   ?? '—'}</td>
      <td>${p.judges_score  ?? '—'}</td>
      <td>${escapeHtml(p.supervisor    || '—')}</td>
      <td class="action-cell">
        <button class="btn-edit   btn-action" data-id="${p.id}">Edit</button>
        <button class="btn-delete btn-action" data-id="${p.id}">Delete</button>
      </td>
    </tr>
  `).join('');
}

// ── Escape HTML to prevent XSS in rendered data ───────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ── Event delegation for Edit / Delete buttons ────────────────────────────────
tableBody.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.classList.contains('btn-edit'))   loadProjectForEdit(id);
  if (btn.classList.contains('btn-delete')) deleteProject(id);
});

// ── Form submit (Create or Update) ───────────────────────────────────────────
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const id     = projectIdField.value;
  const method = id ? 'PUT' : 'POST';
  const url    = id ? `${API_URL}/${id}` : API_URL;

  const gradeRaw = document.getElementById('grade_level').value;
  const scoreRaw = document.getElementById('judges_score').value;

  const payload = {
    project_title: document.getElementById('project_title').value.trim(),
    student_name:  document.getElementById('student_name').value.trim(),
    category:      document.getElementById('category').value.trim(),
    supervisor:    document.getElementById('supervisor').value.trim(),
    grade_level:   gradeRaw !== '' ? parseInt(gradeRaw, 10)    : null,
    judges_score:  scoreRaw !== '' ? parseFloat(scoreRaw)       : null,
    abstract:      document.getElementById('abstract').value.trim()
  };

  try {
    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `${method} failed`);

    showMessage(id ? 'Project updated successfully.' : 'Project created successfully.', 'success');
    resetForm();
    fetchProjects();
  } catch (err) {
    console.error('Submission error:', err);
    showMessage('Error: ' + err.message, 'error');
  }
});

// ── Load a project into the form for editing ──────────────────────────────────
async function loadProjectForEdit(id) {
  try {
    const res     = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error('Could not load project.');
    const project = await res.json();

    projectIdField.value = project.id;
    document.getElementById('project_title').value = project.project_title  || '';
    document.getElementById('student_name').value  = project.student_name   || '';
    document.getElementById('category').value      = project.category       || '';
    document.getElementById('supervisor').value    = project.supervisor     || '';
    document.getElementById('grade_level').value   = project.grade_level    ?? '';
    document.getElementById('judges_score').value  = project.judges_score   ?? '';
    document.getElementById('abstract').value      = project.abstract       || '';

    formHeading.textContent        = 'Edit Project (ID: ' + id + ')';
    submitButton.textContent       = 'Save Changes';
    cancelButton.style.display     = 'inline-block';

    // Scroll to the form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Edit load error:', err);
    showMessage('Could not load project for editing.', 'error');
  }
}

// ── Delete a project ──────────────────────────────────────────────────────────
async function deleteProject(id) {
  if (!confirm(`Delete project ID ${id}? This cannot be undone.`)) return;

  try {
    const res  = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Delete failed');
    showMessage('Project deleted.', 'success');
    fetchProjects();
  } catch (err) {
    console.error('Delete error:', err);
    showMessage('Error: ' + err.message, 'error');
  }
}

// ── Reset form to "create" state ──────────────────────────────────────────────
function resetForm() {
  form.reset();
  projectIdField.value       = '';
  formHeading.textContent    = 'Add New Project';
  submitButton.textContent   = 'Create Project';
  cancelButton.style.display = 'none';
}

cancelButton.addEventListener('click', resetForm);

// ── Initial load ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', fetchProjects);
