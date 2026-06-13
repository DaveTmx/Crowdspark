// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const SALT_ROUNDS = 10;

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ── POST /api/auth/register ───────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check duplicate email
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    // New users start as 'viewer' with 'pending' status — an admin must approve.
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, status)
       VALUES ($1, $2, $3, 'viewer', 'pending')
       RETURNING id, name, email, role, status, created_at`,
      [name.trim(), email.toLowerCase(), hash]
    );

    res.status(201).json({
      message: 'Registration successful. Your account is pending admin approval.',
      user: rows[0],
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account pending approval. Contact an admin.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact an admin.' });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id:        user.id,
        name:      user.name,
        email:     user.email,
        role:      user.role,
        status:    user.status,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.me = async (req, res) => {
  // req.user is attached by the authenticate middleware
  res.json({ user: req.user });
};
