// backend/server.js
// Entry point for the UniHub API server.

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const { initSchema } = require('./config/db');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_ORIGIN          // set in production .env
    : ['http://localhost:3000', 'http://127.0.0.1:5500'],  // dev origins
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limit on auth endpoints to slow brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Please wait and try again.' },
});
app.use('/api/auth/', authLimiter);

// ── Static file serving (uploaded resources) ──────────────────────────────────
// NOTE: In production, serve these via a CDN or private S3 bucket instead.
app.use('/files', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/users',     require('./routes/users'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── Serve frontend in production ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', 'frontend', 'public');
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
}

// ── 404 catcher ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Max size is ${process.env.MAX_FILE_SIZE_MB || 50} MB.` });
  }

  // Multer file type error (thrown in fileFilter)
  if (err.message && err.message.startsWith('File type not allowed')) {
    return res.status(415).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  await initSchema();   // Ensure DB tables exist
  app.listen(PORT, () =>
    console.log(`\n🚀  UniHub API running at http://localhost:${PORT}\n`)
  );
})();
