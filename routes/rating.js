const express = require('express');
const router = express.Router();
const db = require('../db'); // MySQL connection
const auth = require('../middleware/auth');

// ==========================
// GET students to rate (lecturer)
router.get('/students-to-rate', auth(), (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const sql = `SELECT id, username FROM users WHERE role = 'student'`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json(results);
  });
});

// ==========================
// GET lectures to rate (student)
router.get('/lectures-to-rate', auth(), (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const sql = `
    SELECT l.id, l.course_id, l.lecturer_id, u.username AS lecturer_name
    FROM lectures l
    JOIN users u ON l.lecturer_id = u.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json(results);
  });
});

// ==========================
// GET all ratings
router.get('/rating', auth(), (req, res) => {
  // Restrict access to only students and lecturers
  if (req.user.role !== 'student' && req.user.role !== 'lecturer') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const sql = `
    SELECT r.id, r.student_id, r.lecturer_id, r.lecture_id, r.rating, r.comment,
           s.username AS student_name,
           u.username AS lecturer_name
    FROM ratings r
    LEFT JOIN users s ON r.student_id = s.id
    LEFT JOIN users u ON r.lecturer_id = u.id
    ORDER BY r.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json({ ratings: results });
  });
});

// ==========================
// POST rating
router.post('/rating', auth(), (req, res) => {
  const { target_id, rating, comment } = req.body;

  if (!target_id || !rating) {
    return res.status(400).json({ msg: 'Rating and target_id are required' });
  }

  if (req.user.role === 'lecturer') {
    // Lecturer rates student
    if (req.user.role === 'pl') {
      return res.status(403).json({ msg: 'Access denied' });
    }
    const sql = `
      INSERT INTO ratings (student_id, lecturer_id, rating, comment, lecture_id)
      VALUES (?, ?, ?, ?, NULL)
    `;
    db.query(sql, [target_id, req.user.id, rating, comment || null], (err) => {
      if (err) return res.status(500).json({ msg: 'DB error' });
      res.json({ message: 'Rating submitted successfully!' });
    });
  } else if (req.user.role === 'student') {
    // Student rates lecture
    const sqlLecture = `SELECT lecturer_id FROM lectures WHERE id = ?`;
    db.query(sqlLecture, [target_id], (err, results) => {
      if (err) return res.status(500).json({ msg: 'DB error' });
      if (!results.length) return res.status(404).json({ msg: 'Lecture not found' });

      const lecturer_id = results[0].lecturer_id;
      const sqlInsert = `
        INSERT INTO ratings (student_id, lecturer_id, lecture_id, rating, comment)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(sqlInsert, [req.user.id, lecturer_id, target_id, rating, comment || null], (err) => {
        if (err) return res.status(500).json({ msg: 'DB error' });
        res.json({ message: 'Rating submitted successfully!' });
      });
    });
  } else {
    res.status(403).json({ msg: 'Access denied' });
  }
});

module.exports = router;
















