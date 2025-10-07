const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET students for lecturers to rate
router.get('/students-to-rate', auth(), (req, res) => {
  if (req.user.role !== 'lecturer')
    return res.status(403).json({ msg: 'Access denied' });

  db.query(`SELECT id, username FROM users WHERE role = 'student'`, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json(results);
  });
});

// GET lectures (from reports) for students to rate
router.get('/lectures-to-rate', auth(), (req, res) => {
  if (req.user.role !== 'student')
    return res.status(403).json({ msg: 'Access denied' });

  const sql = `
    SELECT r.id, r.course_name, r.lecturer_id, u.username AS lecturer_name
    FROM reports r
    JOIN users u ON r.lecturer_id = u.id
    ORDER BY r.date_of_lecture DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json(results);
  });
});

// GET all ratings
router.get('/rating', auth(), (req, res) => {
  const sql = `
    SELECT r.id, r.student_id, r.lecturer_id, r.lecture_id, r.rating, r.comment,
           rep.course_name,
           s.username AS student_name,
           u.username AS lecturer_name
    FROM ratings r
    LEFT JOIN users s ON r.student_id = s.id
    LEFT JOIN users u ON r.lecturer_id = u.id
    LEFT JOIN reports rep ON r.lecture_id = rep.id
    ORDER BY r.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json({ ratings: results });
  });
});

// POST new rating
router.post('/rating', auth(), (req, res) => {
  const { target_id, rating, comment } = req.body;
  if (!target_id || !rating)
    return res.status(400).json({ msg: 'Rating and target_id required' });

  if (req.user.role === 'lecturer') {
    // Lecturer rates student
    const sql = `
      INSERT INTO ratings (student_id, lecturer_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [target_id, req.user.id, rating, comment || null], (err) => {
      if (err) return res.status(500).json({ msg: 'DB error' });
      res.json({ message: 'Student rated successfully!' });
    });
  } else if (req.user.role === 'student') {
    // Student rates lecture (use report id)
    const sqlReport = `SELECT lecturer_id FROM reports WHERE id = ?`;
    db.query(sqlReport, [target_id], (err, results) => {
      if (err) return res.status(500).json({ msg: 'DB error' });
      if (!results.length) return res.status(404).json({ msg: 'Lecture not found' });

      const lecturer_id = results[0].lecturer_id;
      const sqlInsert = `
        INSERT INTO ratings (student_id, lecturer_id, lecture_id, rating, comment)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(sqlInsert, [req.user.id, lecturer_id, target_id, rating, comment || null], (err) => {
        if (err) return res.status(500).json({ msg: 'DB error' });
        res.json({ message: 'Lecture rated successfully!' });
      });
    });
  } else {
    res.status(403).json({ msg: 'Access denied' });
  }
});

module.exports = router;



















