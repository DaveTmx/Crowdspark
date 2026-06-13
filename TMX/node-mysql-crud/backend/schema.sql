-- ============================================================
-- Science Fair Projects — PostgreSQL Schema
-- Run this once to set up your database.
--
-- Usage:
--   psql -U your_user -d campus_crud -f schema.sql
-- Or paste into pgAdmin / any PostgreSQL client.
-- ============================================================

-- Create the database (run this separately if it doesn't exist yet):
-- CREATE DATABASE campus_crud;

-- Drop and recreate the table cleanly
DROP TABLE IF EXISTS projects;

CREATE TABLE projects (
    id            SERIAL PRIMARY KEY,                  -- Auto-incrementing integer (PostgreSQL style)

    -- Required fields
    project_title VARCHAR(200)   NOT NULL,
    category      VARCHAR(50)    NOT NULL,

    -- Optional fields
    student_name  VARCHAR(150),
    grade_level   INTEGER,
    judges_score  NUMERIC(5, 2), -- Score out of 100.00
    abstract      TEXT,
    supervisor    VARCHAR(150),

    -- Timestamps
    -- PostgreSQL does not support ON UPDATE automatically;
    -- updated_at is managed by the trigger below.
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Trigger to auto-update updated_at on every UPDATE ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO projects (project_title, student_name, category, abstract, grade_level, judges_score, supervisor) VALUES
  ('Web Development',                                    'Alice Mwansa',    'Web Technology',     'Interactive website showcasing HTML, CSS, and JavaScript.',              12, 91.50, 'Mr. Bwalya'),
  ('Pipelining Simulation',                              'Brian Tembo',     'Computer Architecture', 'Diagram and simulation of instruction pipelining in modern CPUs.',    12, 88.00, 'Dr. Sikazwe'),
  ('Population Parameter for Mulungushi University',     'Chipo Banda',     'Statistics',         'Statistical analysis using graphs and charts of university demographic data.', 11, 85.25, 'Ms. Mwale'),
  ('Digital Logic Gates',                                'Daniel Phiri',    'Digital Design',     'Logic gate circuits demonstrated using simulation tools and physical kits.', 10, 89.90, 'Dr. Sikazwe'),
  ('Computer History Database',                          'Emily Zulu',      'Database',           'Timeline supported by a structured database of computer evolution facts.', 12, 94.75, 'Mr. Bwalya'),
  ('Java Calculator Application',                        'Felix Mwape',     'OOP & JAVA',         'Java-based calculator with GUI and basic arithmetic operations.',         11, 87.50, 'Ms. Mwale'),
  ('Network Security Basics',                            'Grace Chanda',    'Networking',         'Introduction to cybersecurity threats and defensive techniques.',         12, 92.00, 'Mr. Bwalya'),
  ('Mobile App for Student Timetables',                  'Hassan Ngombe',   'Mobile Development', 'Android app that helps students manage class timetables efficiently.',   11, 90.10, 'Dr. Sikazwe'),
  ('AI Chatbot for Library Assistance',                  'Ireen Musonda',   'Artificial Intelligence', 'Chatbot system designed to help students locate library materials.', 12, 95.50, 'Ms. Mwale'),
  ('Database for School Inventory',                      'Jackson Lungu',   'Database',           'SQL-based inventory management system for tracking school assets.',       10, 84.90, 'Mr. Bwalya');
