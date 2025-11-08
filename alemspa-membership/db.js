const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Database features will be unavailable.');
}

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    })
  : null;

const query = (text, params) => {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured.');
  }

  return pool.query(text, params);
};

module.exports = {
  pool,
  query,
};
