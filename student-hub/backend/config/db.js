// backend/config/db.js
// Manages the PostgreSQL connection pool and schema initialisation.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'student_hub',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'yourpassword',
  // Keep 10 connections ready; auto-reconnect on idle.
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
});

// ── Schema ────────────────────────────────────────────────────────────────────
// Run once on startup to create tables if they don't already exist.
const initSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      -- ── Roles enum ───────────────────────────────────────────────
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('viewer', 'uploader', 'admin');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      -- ── Resource type enum ────────────────────────────────────────
      DO $$ BEGIN
        CREATE TYPE resource_type AS ENUM ('Notes', 'Past Paper', 'Assignment', 'Lecture', 'Other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      -- ── Users ─────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(120)  NOT NULL,
        email       VARCHAR(255)  NOT NULL UNIQUE,
        password    VARCHAR(255)  NOT NULL,          -- bcrypt hash
        role        user_role     NOT NULL DEFAULT 'viewer',
        status      VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | active | suspended
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      -- ── Resources ─────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS resources (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title         VARCHAR(255)  NOT NULL,
        description   TEXT,
        course        VARCHAR(80),
        type          resource_type NOT NULL DEFAULT 'Other',
        file_path     VARCHAR(500),
        file_name     VARCHAR(255),
        file_size     BIGINT        DEFAULT 0,       -- bytes
        uploader_id   UUID          NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        download_count INT          NOT NULL DEFAULT 0,
        is_published  BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      -- ── Download log ──────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS download_logs (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_id   UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
        user_id       UUID          REFERENCES users(id) ON DELETE SET NULL,
        downloaded_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      -- ── Audit log (RBAC changes) ──────────────────────────────────
      CREATE TABLE IF NOT EXISTS audit_log (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id    UUID          REFERENCES users(id) ON DELETE SET NULL,
        action      VARCHAR(100)  NOT NULL,   -- e.g. 'role_change', 'resource_delete'
        target_id   UUID,
        details     JSONB,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );

      -- ── Indexes ───────────────────────────────────────────────────
      CREATE INDEX IF NOT EXISTS idx_resources_uploader  ON resources(uploader_id);
      CREATE INDEX IF NOT EXISTS idx_resources_course    ON resources(course);
      CREATE INDEX IF NOT EXISTS idx_resources_type      ON resources(type);
      CREATE INDEX IF NOT EXISTS idx_download_logs_res   ON download_logs(resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_actor         ON audit_log(actor_id);
    `);
    console.log('✅  Database schema verified / initialised.');
  } finally {
    client.release();
  }
};

module.exports = { pool, initSchema };
