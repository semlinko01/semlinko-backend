const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connecté à la base de données PostgreSQL (SEMLINKO)');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
