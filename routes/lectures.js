const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// -------------------
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

// -------------------
// GET all available reports (PL uses this to assign lectures)
router.get('/available-reports', auth(), (req, res) => {
  const sql = `
    SELECT id, course_name, course_code, lecturer_id, date_of_lecture
    FROM reports
    ORDER BY id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    res.json(results);
  });
});

// -------------------
// POST a lecture (assign) using report data
router.post('/', auth(), (req, res) => {
  if (req.user.role !== 'pl') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const { report_id } = req.body;
  if (!report_id) return res.status(400).json({ msg: 'Select a lecture from reports' });

  // Step 1: Get report info
  const sqlReport = `SELECT course_name, course_code, lecturer_id, date_of_lecture FROM reports WHERE id = ?`;
  db.query(sqlReport, [report_id], (err, reportResults) => {
    if (err) return res.status(500).json({ msg: 'DB error' });
    if (reportResults.length === 0) return res.status(404).json({ msg: 'Report not found' });

    const report = reportResults[0];

    // Step 2: Get course_id from courses table using course_code
    const sqlCourse = `SELECT id FROM courses WHERE code = ?`;
    db.query(sqlCourse, [report.course_code], (err, courseResults) => {
      if (err) return res.status(500).json({ msg: 'DB error' });
      if (courseResults.length === 0) return res.status(404).json({ msg: 'Course not found' });

      const course_id = courseResults[0].id;
      const lecturer_id = report.lecturer_id;
      const date_of_lecture = report.date_of_lecture;

      // Step 3: Insert lecture
      const sqlInsert = `INSERT INTO lectures (course_id, lecturer_id, date_of_lecture) VALUES (?, ?, ?)`;
      db.query(sqlInsert, [course_id, lecturer_id, date_of_lecture], (err, result) => {
        if (err) return res.status(500).json({ msg: 'DB error', err });
        res.json({ msg: 'Lecture assigned successfully!' });
      });
    });
  });
});

// -------------------
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









