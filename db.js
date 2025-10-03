const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'luct-db',
  port: process.env.DB_PORT || 3306
});

// Connect but don't crash on failure
db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    // Render will still start the server, connection can be retried in your routes
  } else {
    console.log('✅ Connected to MySQL database.');
  }
});

module.exports = db;




