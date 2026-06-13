// backend/routes/auth.js
const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/rbac');

// POST /api/auth/register  – create a new account (starts as viewer, pending)
router.post('/register', authController.register);

// POST /api/auth/login  – exchange credentials for a JWT
router.post('/login', authController.login);

// GET  /api/auth/me  – return current user info (token required)
router.get('/me', authenticate, authController.me);

module.exports = router;
