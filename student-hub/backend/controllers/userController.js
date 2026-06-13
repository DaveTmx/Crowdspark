// backend/controllers/userController.js
// Admin-only user management operations.

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const VALID_ROLES   = ['viewer', 'uploader', 'admin'];
const VALID_STATUSES = ['active', 'pending', 'suspended'];

// Helper: write to audit_log
const audit = (actorId, action, targetId, details) =>
  pool.query(
    `INSERT INTO audit_log (actor_id, action, target_id, details) VALUES ($1, $2, $3, $4)`,
    [actorId, action, targetId, JSON.stringify(details)]
  );

// ── GET /api/users ────────────────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
              COUNT(r.id)::int AS upload_count
       FROM users u
       LEFT JOIN resources r ON r.uploader_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('user list error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

// ── GET /api/users/:id ────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, status, created_at FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
};

// ── PATCH /api/users/:id/role ─────────────────────────────────────────────────
// Core RBAC operation: change a user's role.
exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    // Prevent the last admin from demoting themselves
    if (req.params.id === req.user.id && role !== 'admin') {
      const { rows } = await pool.query(
        `SELECT COUNT(*) FROM users WHERE role = 'admin'`
      );
      if (parseInt(rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin.' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, email, role, status`,
      [role, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    await audit(req.user.id, 'role_change', req.params.id, { new_role: role });

    res.json({ message: `Role updated to '${role}'.`, user: rows[0] });
  } catch (err) {
    console.error('changeRole error:', err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
};

// ── PATCH /api/users/:id/status ───────────────────────────────────────────────
// Approve, suspend, or reactivate a user account.
exports.changeStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const { rows } = await pool.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, email, role, status`,
      [status, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    await audit(req.user.id, 'status_change', req.params.id, { new_status: status });

    res.json({ message: `Account status set to '${status}'.`, user: rows[0] });
  } catch (err) {
    console.error('changeStatus error:', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
};

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const { rows } = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    await audit(req.user.id, 'user_delete', req.params.id, { deleted_user: rows[0].email });

    res.json({ message: 'User deleted.', user: rows[0] });
  } catch (err) {
    console.error('remove user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};

// ── GET /api/users/audit-log ──────────────────────────────────────────────────
exports.auditLog = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT al.*, u.name AS actor_name, u.email AS actor_email
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.actor_id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );
    res.json({ log: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit log.' });
  }
};
