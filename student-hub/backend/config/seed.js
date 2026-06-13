// backend/config/seed.js
// Run: node config/seed.js
// Seeds the database with demo users (admin, uploaders, viewers) and sample resources.

const bcrypt = require('bcryptjs');
const { pool, initSchema } = require('./db');

const SALT_ROUNDS = 10;

const users = [
  { name: 'Dr. Admin Phiri',   email: 'admin@unihub.ac.zm',  password: 'Admin@1234',   role: 'admin',    status: 'active' },
  { name: 'Chanda Mulenga',    email: 'chanda@unihub.ac.zm', password: 'Uploader@123', role: 'uploader', status: 'active' },
  { name: 'Bupe Nkosi',        email: 'bupe@unihub.ac.zm',   password: 'Uploader@123', role: 'uploader', status: 'active' },
  { name: 'Mutale Banda',      email: 'mutale@unihub.ac.zm', password: 'Viewer@1234',  role: 'viewer',   status: 'active' },
  { name: 'Namakau Sitwala',   email: 'namakau@unihub.ac.zm',password: 'Viewer@1234',  role: 'viewer',   status: 'pending' },
];

const resources = (ids) => [
  { title: 'Data Structures & Algorithms — Complete Notes', course: 'CS302', type: 'Notes',      description: 'Comprehensive notes covering arrays, trees, graphs, and dynamic programming.', uploader_id: ids[1] },
  { title: 'Database Systems Midterm 2024',                 course: 'CS401', type: 'Past Paper',  description: 'Full midterm paper with model answers for ER diagrams and SQL.', uploader_id: ids[2] },
  { title: 'OS — Process Scheduling Lecture Slides',        course: 'CS305', type: 'Lecture',     description: "Prof Mwale's slides on CPU scheduling algorithms.", uploader_id: ids[1] },
  { title: 'Linear Algebra Assignment 3 — Solutions',       course: 'MATH201', type: 'Assignment', description: 'Worked solutions for eigenvalue problems and matrix transformations.', uploader_id: ids[2] },
  { title: 'Network Security Exam Paper 2023',              course: 'CS410', type: 'Past Paper',  description: 'Final exam covering cryptography, firewalls, and intrusion detection.', uploader_id: ids[1] },
  { title: 'Calculus II — Integration Techniques',          course: 'MATH202', type: 'Notes',     description: 'Handwritten notes on integration by parts and partial fractions.', uploader_id: ids[2] },
];

(async () => {
  await initSchema();

  // Clear existing demo data
  await pool.query(`DELETE FROM download_logs; DELETE FROM resources; DELETE FROM users;`);

  // Insert users
  const insertedIds = [];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, status) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [u.name, u.email, hash, u.role, u.status]
    );
    insertedIds.push(rows[0].id);
    console.log(`  ➕  User: ${u.email}  (${u.role})`);
  }

  // Insert sample resources
  for (const r of resources(insertedIds)) {
    await pool.query(
      `INSERT INTO resources (title, course, type, description, uploader_id, download_count)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [r.title, r.course, r.type, r.description, r.uploader_id, Math.floor(Math.random() * 200)]
    );
    console.log(`  📄  Resource: ${r.title.slice(0, 50)}`);
  }

  console.log('\n✅  Seed complete.\n');
  process.exit(0);
})();
