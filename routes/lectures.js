const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET lectures (all except student)
router.get('/', auth(), (req, res) => {
  if (req.user.role === 'student') return res.status(403).json({ message: 'Access denied' });
  const sql = `SELECT l.*, c.course_name, c.course_code, u.username AS lecturer_name 
               FROM lectures l 
               LEFT JOIN courses c ON l.course_id = c.id 
               LEFT JOIN users u ON l.lecturer_id = u.id 
               ORDER BY l.date_of_lecture ASC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

// POST lecture (PL only)
router.post('/', auth(), (req, res) => {
  if (req.user.role !== 'pl') return res.status(403).json({ message: 'Access denied' });
  const { course_id, lecturer_id, date_of_lecture } = req.body;
  if (!course_id || !lecturer_id || !date_of_lecture) {
    return res.status(400).json({ message: 'Course ID, Lecturer ID, and Date of Lecture are required' });
  }

  const sql = `INSERT INTO lectures (course_id, lecturer_id, date_of_lecture) VALUES (?, ?, ?)`;
  db.query(sql, [course_id, lecturer_id, date_of_lecture], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(201).json({ message: 'Lecture created', id: result.insertId });
  });
});

// PUT lecture (PL only)
router.put('/:id', auth(), (req, res) => {
  if (req.user.role !== 'pl') return res.status(403).json({ message: 'Access denied' });
  const lectureId = req.params.id;
  const { course_id, lecturer_id, date_of_lecture } = req.body;
  if (!course_id && !lecturer_id && !date_of_lecture) {
    return res.status(400).json({ message: 'At least one field required' });
  }

  const sql = `UPDATE lectures SET course_id = ?, lecturer_id = ?, date_of_lecture = ? WHERE id = ?`;
  db.query(sql, [course_id, lecturer_id, date_of_lecture, lectureId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Lecture not found' });
    res.json({ message: 'Lecture updated' });
  });
});

// DELETE lecture (PL only)
router.delete('/:id', auth(), (req, res) => {
  if (req.user.role !== 'pl') return res.status(403).json({ message: 'Access denied' });
  const lectureId = req.params.id;
  const sql = `DELETE FROM lectures WHERE id = ?`;
  db.query(sql, [lectureId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Lecture not found' });
    res.json({ message: 'Lecture deleted' });
  });
});

module.exports = router;



