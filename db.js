const mysql = require('mysql2');
require('dotenv').config();

// Use environment variables if set, otherwise fallback to FreeSQL credentials
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'sql10.freesqldatabase.com',
  user: process.env.DB_USER || 'sql10801261',
  password: process.env.DB_PASSWORD || 'Fr2PBUsGXq',
  database: process.env.DB_NAME || 'sql10801261',
  port: process.env.DB_PORT || 3306
});

// Connect to database
db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    // Do NOT exit; allow server to start so you can debug via routes
  } else {
    console.log('✅ Connected to MySQL database.');
  }
});

module.exports = db;



