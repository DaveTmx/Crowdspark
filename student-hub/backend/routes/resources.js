// backend/routes/resources.js
//
// RBAC at a glance:
//   GET  /            → any authenticated user  (viewer, uploader, admin)
//   GET  /:id         → any authenticated user
//   POST /            → uploader or admin only
//   PUT  /:id         → owner OR admin
//   DELETE /:id       → owner OR admin
//   GET  /:id/download → any authenticated user

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const router   = express.Router();

const rc = require('../controllers/resourceController');
const { authenticate, requireRole, requireOwnerOrAdmin } = require('../middleware/rbac');

// ── File upload configuration ─────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
require('fs').mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.zip', '.txt', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${ext}`), false);
  }
};

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50');

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// List / search resources — all authenticated users
router.get('/', authenticate, rc.list);

// Get one resource — all authenticated users
router.get('/:id', authenticate, rc.getOne);

// Upload a new resource — uploader and admin only
router.post(
  '/',
  authenticate,
  requireRole('uploader', 'admin'),
  upload.single('file'),
  rc.create
);

// Update a resource — owner or admin (loadResource populates req.resource)
router.put(
  '/:id',
  authenticate,
  rc.loadResource,
  requireOwnerOrAdmin,
  rc.update
);

// Delete a resource — owner or admin
router.delete(
  '/:id',
  authenticate,
  rc.loadResource,
  requireOwnerOrAdmin,
  rc.remove
);

// Download — all authenticated users; increments counter + logs
router.get('/:id/download', authenticate, rc.download);

module.exports = router;
