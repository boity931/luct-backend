// routes/monitoring.js
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// View Monitoring Data with optional search
router.get('/', auth(), (req, res) => {
  const rawSearch = req.query.q || '';
  const search = `%${rawSearch}%`;

  const sql = `
    SELECT * FROM reports
    WHERE course_name LIKE ?
  `;

  db.query(sql, [search], (err, results) => {
    if (err) {
      console.error('❌ Error fetching monitoring data:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

module.exports = router;
