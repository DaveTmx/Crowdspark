// backend/middleware/rbac.js
// Role-Based Access Control (RBAC) middleware.
//
// PERMISSION MODEL
// ────────────────
//   viewer   → can browse and download resources.
//   uploader → can do everything a viewer can, plus upload / edit / delete
//              their OWN resources.
//   admin    → full access: manage any resource, any user, and roles.
//
// HOW IT WORKS
// ────────────
// 1. authenticate()  – verifies the JWT and attaches req.user.
// 2. requireRole()   – gate a route to one or more roles.
// 3. requireOwnerOrAdmin() – allows resource owners OR admins only.
// 4. PERMISSIONS map – single source of truth for capability checks.

const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// ── Permission map ────────────────────────────────────────────────────────────
const PERMISSIONS = {
  viewer: [
    'resource:browse',
    'resource:download',
  ],
  uploader: [
    'resource:browse',
    'resource:download',
    'resource:upload',
    'resource:edit_own',
    'resource:delete_own',
  ],
  admin: [
    'resource:browse',
    'resource:download',
    'resource:upload',
    'resource:edit_own',
    'resource:delete_own',
    'resource:edit_any',
    'resource:delete_any',
    'user:manage',
    'user:approve',
    'user:assign_role',
    'audit:read',
  ],
};

/** Check whether a given role has a specific permission. */
const hasPermission = (role, permission) =>
  (PERMISSIONS[role] || []).includes(permission);

// ── authenticate ─────────────────────────────────────────────────────────────
/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the full user record to req.user on success.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch user from DB so role / status changes take effect immediately
    const { rows } = await pool.query(
      'SELECT id, name, email, role, status FROM users WHERE id = $1',
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const user = rows[0];

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact an administrator.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account pending approval. Contact an administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// ── requireRole ──────────────────────────────────────────────────────────────
/**
 * Gate a route to one or more roles.
 * Usage:  router.post('/upload', authenticate, requireRole('uploader', 'admin'), ...)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Access denied. Required role: ${roles.join(' or ')}.`,
      yourRole: req.user.role,
    });
  }
  next();
};

// ── requirePermission ────────────────────────────────────────────────────────
/**
 * Gate a route on a specific permission string.
 * Usage:  router.delete('/:id', authenticate, requirePermission('resource:delete_any'), ...)
 */
const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  if (!hasPermission(req.user.role, permission)) {
    return res.status(403).json({
      error: `Permission denied: ${permission}`,
      yourRole: req.user.role,
    });
  }
  next();
};

// ── requireOwnerOrAdmin ───────────────────────────────────────────────────────
/**
 * For resource mutations: allow if the caller owns the resource OR is an admin.
 * Expects the resource record to already be on req.resource (set by a prior middleware).
 *
 * Usage:
 *   router.put('/:id', authenticate, loadResource, requireOwnerOrAdmin, controller.update)
 */
const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  if (!req.resource) {
    return res.status(500).json({ error: 'req.resource not set by prior middleware.' });
  }

  const isAdmin = req.user.role === 'admin';
  const isOwner = req.resource.uploader_id === req.user.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      error: 'You can only modify your own resources.',
    });
  }
  next();
};

// ── adminOnly ────────────────────────────────────────────────────────────────
/** Shorthand: admin-only gate. */
const adminOnly = requireRole('admin');

module.exports = {
  PERMISSIONS,
  hasPermission,
  authenticate,
  requireRole,
  requirePermission,
  requireOwnerOrAdmin,
  adminOnly,
};
