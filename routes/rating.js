const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET students for lecturers to rate
router.get('/students-to-rate', auth(), (req, res) => {
  if (req.user.role !== 'lecturer')
    return res.status(403).json({ msg: 'Access denied' });

  db.query(`SELECT id, username FROM users WHERE role = 'student'`, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error fetching students' });
    res.json(results);
  });
});

// GET lectures for students to rate
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
    if (err) return res.status(500).json({ msg: 'DB error fetching lectures' });
    res.json(results);
  });
});

// GET all ratings
router.get('/rating', auth(), (req, res) => {
  if (!['student', 'lecturer'].includes(req.user.role)) {
    return res.status(403).json({ msg: 'You do not have access to view ratings.' });
  }

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
    if (err) return res.status(500).json({ msg: 'DB error fetching ratings' });
    res.json({ ratings: results });
  });
});

// POST new rating
router.post('/rating', auth(), (req, res) => {
  const { target_id, rating, comment } = req.body;
  if (!target_id || !rating)
    return res.status(400).json({ msg: 'Rating and target_id required' });

  if (req.user.role === 'lecturer') {
    const sql = `
      INSERT INTO ratings (student_id, lecturer_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [target_id, req.user.id, rating, comment || null], (err) => {
      if (err) {
        console.error('DB insert rating error:', err);
        return res.status(500).json({ msg: 'DB error inserting student rating' });
      }
      res.json({ message: 'Student rated successfully!' });
    });
  } else if (req.user.role === 'student') {
    const sqlReport = `SELECT lecturer_id FROM reports WHERE id = ?`;
    db.query(sqlReport, [target_id], (err, results) => {
      if (err) {
        console.error('DB fetch lecture error:', err);
        return res.status(500).json({ msg: 'DB error fetching lecture' });
      }

      if (!results.length || !results[0].lecturer_id) {
        return res.status(400).json({ msg: 'Lecture not valid for rating' });
      }

      const lecturer_id = results[0].lecturer_id;
      const sqlInsert = `
        INSERT INTO ratings (student_id, lecturer_id, lecture_id, rating, comment)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(sqlInsert, [req.user.id, lecturer_id, target_id, rating, comment || null], (err) => {
        if (err) {
          console.error('DB insert rating error:', err);
          return res.status(500).json({ msg: 'Error inserting lecture rating' });
        }
        res.json({ message: 'Lecture rated successfully!' });
      });
    });
  } else {
    res.status(403).json({ msg: 'You do not have access to submit ratings.' });
  }
});

module.exports = router;




















