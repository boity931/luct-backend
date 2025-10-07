const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get all courses
router.get('/', (req, res) => {
  db.query('SELECT * FROM courses', (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error', err });
    res.json(results);
  });
});

// Add course
router.post('/', auth(), (req, res) => {
  if (req.user.role !== 'pl') return res.status(403).json({ msg: 'Access denied' });

  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ msg: 'Missing fields' });

  db.query('INSERT INTO courses (name, code) VALUES (?, ?)', [name, code], (err, result) => {
    if (err) return res.status(500).json({ msg: 'DB error', err });
    res.json({ msg: 'Course added', id: result.insertId });
  });
});

// Delete course
router.delete('/:id', auth(), (req, res) => {
  if (req.user.role !== 'pl') return res.status(403).json({ msg: 'Access denied' });

  const courseId = req.params.id;
  db.query('DELETE FROM courses WHERE id = ?', [courseId], (err, result) => {
    if (err) return res.status(500).json({ msg: 'DB error', err });
    if (result.affectedRows === 0) return res.status(404).json({ msg: 'Course not found' });
    res.json({ msg: 'Course deleted' });
  });
});

module.exports = router;


