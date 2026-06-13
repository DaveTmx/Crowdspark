// server.js

// 1. Load environment variables
require('dotenv').config();

// 2. Imports
const express = require('express');
const cors    = require('cors');
const db      = require('./db');

// 3. App setup
const app           = express();
const PORT          = process.env.PORT || 3000;
const RESOURCE_PATH = `/api/${process.env.RESOURCE || 'projects'}`;

// 4. Middleware
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '10kb' }));

// ── Validation helper ─────────────────────────────────────────────────────────
function validateProjectFields({ project_title, category }) {
  if (!project_title || typeof project_title !== 'string' || !project_title.trim())
    return 'project_title is required.';
  if (project_title.trim().length > 200)
    return 'project_title must be 200 characters or fewer.';
  if (!category || typeof category !== 'string' || !category.trim())
    return 'category is required.';
  if (category.trim().length > 50)
    return 'category must be 50 characters or fewer.';
  return null;
}

// ── GET /api/projects — list all ──────────────────────────────────────────────
app.get(RESOURCE_PATH, async (req, res) => {
  try {
    // PostgreSQL uses RETURNING and standard SQL — no change needed here
    const result = await db.query('SELECT * FROM projects ORDER BY id DESC');
    res.json(result.rows); // pg uses .rows, not [rows] like mysql2
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to retrieve projects.' });
  }
});

// ── GET /api/projects/:id — get one ──────────────────────────────────────────
app.get(`${RESOURCE_PATH}/:id`, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid project ID.' });

  try {
    // PostgreSQL uses $1, $2 … instead of MySQL's ?
    const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Project not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error fetching project ${id}:`, err);
    res.status(500).json({ error: 'Failed to retrieve project.' });
  }
});

// ── POST /api/projects — create ───────────────────────────────────────────────
app.post(RESOURCE_PATH, async (req, res) => {
  const { project_title, student_name, category, grade_level, judges_score, abstract, supervisor } = req.body;

  const validationError = validateProjectFields({ project_title, category });
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    // RETURNING id lets PostgreSQL hand back the new row's id immediately
    const sql = `
      INSERT INTO projects
        (project_title, student_name, category, grade_level, judges_score, abstract, supervisor)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const values = [
      project_title.trim(),
      student_name  ? student_name.trim()  : null,
      category.trim(),
      grade_level   !== undefined ? grade_level  : null,
      judges_score  !== undefined ? judges_score : null,
      abstract      ? abstract.trim()      : null,
      supervisor    ? supervisor.trim()    : null,
    ];
    const result = await db.query(sql, values);
    res.status(201).json({ message: 'Project created successfully.', id: result.rows[0].id });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// ── PUT /api/projects/:id — update ───────────────────────────────────────────
app.put(`${RESOURCE_PATH}/:id`, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid project ID.' });

  const { project_title, student_name, category, grade_level, judges_score, abstract, supervisor } = req.body;

  // Build dynamic SET clause with PostgreSQL $N placeholders
  const fields = [];
  const values = [];
  let   paramIndex = 1; // PostgreSQL placeholders start at $1

  if (project_title !== undefined) {
    if (!project_title.trim()) return res.status(400).json({ error: 'project_title cannot be empty.' });
    if (project_title.trim().length > 200) return res.status(400).json({ error: 'project_title too long.' });
    fields.push(`project_title = $${paramIndex++}`); values.push(project_title.trim());
  }
  if (student_name !== undefined) {
    fields.push(`student_name = $${paramIndex++}`);  values.push(student_name.trim());
  }
  if (category !== undefined) {
    if (category.trim().length > 50) return res.status(400).json({ error: 'category too long.' });
    fields.push(`category = $${paramIndex++}`);      values.push(category.trim());
  }
  if (grade_level  !== undefined) { fields.push(`grade_level = $${paramIndex++}`);  values.push(grade_level); }
  if (judges_score !== undefined) { fields.push(`judges_score = $${paramIndex++}`); values.push(judges_score); }
  if (abstract     !== undefined) { fields.push(`abstract = $${paramIndex++}`);     values.push(abstract.trim()); }
  if (supervisor   !== undefined) { fields.push(`supervisor = $${paramIndex++}`);   values.push(supervisor.trim()); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields provided for update.' });

  values.push(id); // id is the last placeholder

  try {
    const sql    = `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id`;
    const result = await db.query(sql, values);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Project not found or no changes made.' });
    res.json({ message: 'Project updated successfully.', id });
  } catch (err) {
    console.error(`Error updating project ${id}:`, err);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// ── DELETE /api/projects/:id — delete ────────────────────────────────────────
app.delete(`${RESOURCE_PATH}/:id`, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid project ID.' });

  try {
    // RETURNING id confirms which row was deleted
    const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Project not found.' });
    res.json({ message: 'Project deleted successfully.', id });
  } catch (err) {
    console.error(`Error deleting project ${id}:`, err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// 5. Start server
app.listen(PORT, () => {
  console.log(`\n🎉 Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}${RESOURCE_PATH}`);
});
