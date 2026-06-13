// db.js

// 1. Load environment variables
require('dotenv').config();

// 2. Import the pg library
const { Pool } = require('pg');

// 3. Configure the connection pool.
//    You can use individual variables OR a single DATABASE_URL connection string.
//    DATABASE_URL takes priority if both are set (useful for Render, Railway, Heroku, etc.)
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        // Required when connecting to hosted PostgreSQL (e.g. Render, Heroku)
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      }
    : {
        host:     process.env.DB_HOST     || '127.0.0.1',
        port:     parseInt(process.env.DB_PORT || '5432', 10),
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
);

// 4. Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✅ Connected to PostgreSQL database!');
  release();
});

// 5. Export a simple query helper so the rest of the app
//    doesn't need to manage clients manually.
module.exports = {
  /**
   * Run a parameterised query.
   * @param {string} text   - SQL with $1, $2 … placeholders
   * @param {Array}  params - Values for the placeholders
   * @returns {Promise<import('pg').QueryResult>}
   */
  query: (text, params) => pool.query(text, params),
};
