// backend/controllers/resourceController.js
// All resource operations. RBAC is enforced at the route level (middleware/rbac.js),
// with secondary ownership checks inside handlers where needed.

const path = require('path');
const fs   = require('fs');
const { pool } = require('../config/db');

// ── GET /api/resources ────────────────────────────────────────────────────────
// Any authenticated user can list published resources.
exports.list = async (req, res) => {
  try {
    const { course, type, q, page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ['r.is_published = TRUE'];

    if (course) {
      params.push(`%${course}%`);
      conditions.push(`r.course ILIKE $${params.length}`);
    }
    if (type) {
      params.push(type);
      conditions.push(`r.type = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(
        `(r.title ILIKE $${params.length} OR r.description ILIKE $${params.length} OR r.course ILIKE $${params.length})`
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit), offset);

    const { rows } = await pool.query(
      `SELECT
         r.id, r.title, r.description, r.course, r.type,
         r.file_name, r.file_size, r.download_count, r.created_at,
         u.id   AS uploader_id,
         u.name AS uploader_name
       FROM resources r
       JOIN users u ON u.id = r.uploader_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Total count for pagination
    const countParams = params.slice(0, -2);
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM resources r ${where}`,
      countParams
    );

    res.json({
      resources: rows,
      total:    parseInt(countRows[0].count),
      page:     parseInt(page),
      limit:    parseInt(limit),
    });
  } catch (err) {
    console.error('list error:', err);
    res.status(500).json({ error: 'Failed to fetch resources.' });
  }
};

// ── GET /api/resources/:id ────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS uploader_name, u.email AS uploader_email
       FROM resources r
       JOIN users u ON u.id = r.uploader_id
       WHERE r.id = $1 AND r.is_published = TRUE`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Resource not found.' });

    res.json({ resource: rows[0] });
  } catch (err) {
    console.error('getOne error:', err);
    res.status(500).json({ error: 'Failed to fetch resource.' });
  }
};

// ── POST /api/resources ───────────────────────────────────────────────────────
// Requires: uploader or admin role (enforced in route).
exports.create = async (req, res) => {
  try {
    const { title, description, course, type } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'title and type are required.' });
    }

    const validTypes = ['Notes', 'Past Paper', 'Assignment', 'Lecture', 'Other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    // Handle optional file upload (multer puts it on req.file)
    let filePath  = null;
    let fileName  = null;
    let fileSize  = 0;

    if (req.file) {
      filePath = req.file.path;
      fileName = req.file.originalname;
      fileSize = req.file.size;
    }

    const { rows } = await pool.query(
      `INSERT INTO resources (title, description, course, type, file_path, file_name, file_size, uploader_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, course, type, file_name, file_size, created_at`,
      [title.trim(), description || null, course || null, type, filePath, fileName, fileSize, req.user.id]
    );

    res.status(201).json({
      message: 'Resource published.',
      resource: rows[0],
    });
  } catch (err) {
    console.error('create error:', err);
    res.status(500).json({ error: 'Failed to create resource.' });
  }
};

// ── PUT /api/resources/:id ────────────────────────────────────────────────────
// requireOwnerOrAdmin middleware enforces ownership before this runs.
exports.update = async (req, res) => {
  try {
    const { title, description, course, type, is_published } = req.body;

    const { rows } = await pool.query(
      `UPDATE resources
       SET title        = COALESCE($1, title),
           description  = COALESCE($2, description),
           course       = COALESCE($3, course),
           type         = COALESCE($4, type),
           is_published = COALESCE($5, is_published),
           updated_at   = NOW()
       WHERE id = $6
       RETURNING id, title, course, type, is_published, updated_at`,
      [title, description, course, type, is_published, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Resource not found.' });

    res.json({ message: 'Resource updated.', resource: rows[0] });
  } catch (err) {
    console.error('update error:', err);
    res.status(500).json({ error: 'Failed to update resource.' });
  }
};

// ── DELETE /api/resources/:id ─────────────────────────────────────────────────
// requireOwnerOrAdmin middleware enforces ownership before this runs.
exports.remove = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM resources WHERE id = $1 RETURNING id, file_path',
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Resource not found.' });

    // Clean up the physical file if it exists
    if (rows[0].file_path && fs.existsSync(rows[0].file_path)) {
      fs.unlinkSync(rows[0].file_path);
    }

    res.json({ message: 'Resource deleted.' });
  } catch (err) {
    console.error('remove error:', err);
    res.status(500).json({ error: 'Failed to delete resource.' });
  }
};

// ── GET /api/resources/:id/download ──────────────────────────────────────────
// Increments the download counter, logs the event, and serves the file.
exports.download = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE resources
       SET download_count = download_count + 1
       WHERE id = $1 AND is_published = TRUE
       RETURNING file_path, file_name`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Resource not found.' });

    // Log the download
    await pool.query(
      `INSERT INTO download_logs (resource_id, user_id) VALUES ($1, $2)`,
      [req.params.id, req.user.id]
    );

    const { file_path, file_name } = rows[0];

    if (!file_path || !fs.existsSync(file_path)) {
      // No physical file attached — just confirm the count was incremented
      return res.json({ message: 'Download counted. No file attached to this resource.' });
    }

    res.download(file_path, file_name);
  } catch (err) {
    console.error('download error:', err);
    res.status(500).json({ error: 'Failed to process download.' });
  }
};

// ── Middleware: load resource onto req.resource ───────────────────────────────
// Used before requireOwnerOrAdmin so it can inspect uploader_id.
exports.loadResource = async (req, res, next) => {
  const { rows } = await pool.query(
    'SELECT * FROM resources WHERE id = $1',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Resource not found.' });
  req.resource = rows[0];
  next();
};
