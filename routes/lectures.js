const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET all lectures
router.get('/', auth(), (req, res) => {
  const sql = `
    SELECT l.*, c.name AS course_name
    FROM lectures l
    LEFT JOIN courses c ON l.course_id = c.id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json(results);
  });
});

// GET all available reports
router.get('/available-reports', auth(), (req, res) => {
  const sql = `
    SELECT r.id, c.name AS course_name, c.code AS course_code, r.lecturer_id, r.date_of_lecture
    FROM reports r
    LEFT JOIN courses c ON r.course_code = c.code
    ORDER BY r.id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json(results);
  });
});

// POST a lecture
router.post('/', auth(), (req, res) => {
  if (req.user.role !== 'pl') return res.status(403).json({ msg: 'Access denied' });
  const { report_id } = req.body;
  if (!report_id) return res.status(400).json({ msg: 'Select a lecture from reports' });

  const sql = `
    INSERT INTO lectures (course_id, lecturer_id, date_of_lecture)
    SELECT c.id, r.lecturer_id, r.date_of_lecture
    FROM reports r
    JOIN courses c ON r.course_code = c.code
    WHERE r.id = ?
  `;
  db.query(sql, [report_id], (err, result) => {
    if (err) return res.status(500).json({ msg: 'DB error', err });
    if (result.affectedRows === 0) return res.status(404).json({ msg: 'Report not found or course missing' });
    res.json({ msg: 'Lecture assigned successfully!' });
  });
});

// DELETE a lecture
router.delete('/:id', auth(), (req, res) => {
  if (req.user.role !== 'pl') return res.status(403).json({ msg: 'Access denied' });
  const sql = `DELETE FROM lectures WHERE id = ?`;
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    if (result.affectedRows === 0) return res.status(404).json({ msg: 'Lecture not found' });
    res.json({ msg: 'Lecture deleted successfully!' });
  });
});

module.exports = router;









