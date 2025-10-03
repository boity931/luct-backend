const express = require('express');
const router = express.Router();
const db = require('../db');

// get all courses
router.get('/', (req, res) => {
  db.query('SELECT * FROM courses', (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error', err });
    res.json(results);
  });
});

// add course
router.post('/', (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ msg: 'Missing fields' });

  db.query(
    'INSERT INTO courses (name, code) VALUES (?, ?)',
    [name, code],
    (err, result) => {
      if (err) return res.status(500).json({ msg: 'DB error', err });
      res.json({ msg: 'Course added', id: result.insertId });
    }
  );
});

module.exports = router;

