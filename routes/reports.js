const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const XLSX = require('xlsx');

const router = express.Router();

// -------------------------
// GET all reports (role-based filtering)
router.get('/', auth(), (req, res) => {
  const userRole = req.user.role;
  let sql;

  if (userRole === 'student') {
    // Students should only see reports for rating (minimal data)
    sql = `
      SELECT r.id, r.lecturer_name, r.date_of_lecture, r.topic_taught
      FROM reports r
      LEFT JOIN classes c ON r.class_id = c.class_id
      ORDER BY r.date_of_lecture DESC
    `;
  } else if (userRole === 'pl') {
    // PL gets PRL feedback reports, excluding rating-like data from feedback
    sql = `
      SELECT r.id, r.faculty_name, r.class_id, c.class_name, r.week_of_reporting, r.date_of_lecture,
             r.course_name, r.course_code, r.lecturer_name, r.actual_number_of_students_present,
             r.total_number_of_registered_students, r.venue, r.scheduled_lecture_time, r.topic_taught,
             r.learning_outcomes, r.recommendations, r.lecturer_id,
             CASE 
               WHEN r.feedback REGEXP 'Rating:[0-5]' THEN 'Feedback available (ratings removed)'
               ELSE r.feedback
             END AS feedback
      FROM reports r
      LEFT JOIN classes c ON r.class_id = c.class_id
      ORDER BY r.date_of_lecture DESC
    `;
  } else {
    // Lecturers and PRL get full reports (excluding feedback for lecturers)
    sql = `
      SELECT r.*, c.class_name, c.venue
      FROM reports r
      LEFT JOIN classes c ON r.class_id = c.class_id
      ORDER BY r.date_of_lecture DESC
    `;
    if (userRole === 'lecturer') {
      // Remove feedback from lecturer view if not needed
      sql = sql.replace('r.*, c.class_name, c.venue', 'r.id, r.faculty_name, r.class_id, c.class_name, r.week_of_reporting, r.date_of_lecture, r.course_name, r.course_code, r.lecturer_name, r.actual_number_of_students_present, r.total_number_of_registered_students, r.venue, r.scheduled_lecture_time, r.topic_taught, r.learning_outcomes, r.recommendations, r.lecturer_id');
    }
  }

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    res.json(results);
  });
});

// -------------------------
// GET reports for PRL feedback
router.get('/prl-feedback', auth(), (req, res) => {
  if (req.user.role !== 'prl' && req.user.role !== 'pl') {
    return res.status(403).json({ message: 'Access denied. Only PRL or PL can view this.' });
  }

  const sql = `
    SELECT r.id, r.faculty_name, r.class_id, c.class_name, r.week_of_reporting, r.date_of_lecture,
           r.course_name, r.course_code, r.lecturer_name, r.actual_number_of_students_present,
           r.total_number_of_registered_students, r.venue, r.scheduled_lecture_time, r.topic_taught,
           r.learning_outcomes, r.recommendations, r.lecturer_id,
           CASE 
             WHEN r.feedback REGEXP 'Rating:[0-5]' THEN 'Feedback available (ratings removed)'
             ELSE r.feedback
           END AS feedback
    FROM reports r
    LEFT JOIN classes c ON r.class_id = c.class_id
    ORDER BY r.date_of_lecture DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    res.json(results);
  });
});

// -------------------------
// GET a single report by ID
router.get('/:id', auth(), (req, res) => {
  const reportId = req.params.id;
  const userRole = req.user.role;
  let sql;

  if (userRole === 'student') {
    sql = `
      SELECT r.id, r.lecturer_name, r.date_of_lecture, r.topic_taught
      FROM reports r
      LEFT JOIN classes c ON r.class_id = c.class_id
      WHERE r.id = ?
    `;
  } else if (userRole === 'pl') {
    sql = `
      SELECT r.*, c.class_name, c.venue,
             CASE 
               WHEN r.feedback REGEXP 'Rating:[0-5]' THEN 'Feedback available (ratings removed)'
               ELSE r.feedback
             END AS feedback
      FROM reports r
      LEFT JOIN classes c ON r.class_id = c.class_id
      WHERE r.id = ?
    `;
  } else {
    sql = `
      SELECT r.*, c.class_name, c.venue
      FROM reports r
      LEFT JOIN classes c ON r.class_id = c.class_id
      WHERE r.id = ?
    `;
    if (userRole === 'lecturer') {
      sql = sql.replace('r.*, c.class_name, c.venue', 'r.id, r.faculty_name, r.class_id, c.class_name, r.week_of_reporting, r.date_of_lecture, r.course_name, r.course_code, r.lecturer_name, r.actual_number_of_students_present, r.total_number_of_registered_students, r.venue, r.scheduled_lecture_time, r.topic_taught, r.learning_outcomes, r.recommendations, r.lecturer_id');
    }
  }

  db.query(sql, [reportId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Report not found' });
    res.json(results[0]);
  });
});

// -------------------------
// CREATE a new report
router.post('/', auth(), (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ message: 'Access denied. Only lecturers can create reports.' });
  }
  const fields = req.body;
  const keys = Object.keys(fields);
  const values = Object.values(fields);

  if (!fields.class_id || !fields.date_of_lecture) {
    return res.status(400).json({ message: 'class_id and date_of_lecture are required' });
  }

  db.query('SELECT class_id FROM classes WHERE class_id = ?', [fields.class_id], (err, classResult) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (classResult.length === 0) return res.status(400).json({ message: `Invalid class_id: ${fields.class_id}` });

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO reports (${keys.join(', ')}) VALUES (${placeholders})`;

    db.query(sql, values, (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      res.status(201).json({ message: 'Report created successfully', id: result.insertId });
    });
  });
});

// -------------------------
// UPDATE a report
router.put('/:id', auth(), (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ message: 'Access denied. Only lecturers can update reports.' });
  }
  const reportId = req.params.id;
  const fields = req.body;
  if (!reportId) return res.status(400).json({ message: 'Report ID is required' });
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.status(400).json({ message: 'No fields provided to update' });

  const updateReport = () => {
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => fields[key]);
    const sql = `UPDATE reports SET ${setClause} WHERE id = ?`;
    db.query(sql, [...values, reportId], (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Report not found' });
      res.json({ message: 'Report updated successfully' });
    });
  };

  if (fields.class_id) {
    db.query('SELECT class_id FROM classes WHERE class_id = ?', [fields.class_id], (err, classResult) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err.message });
      if (classResult.length === 0) return res.status(400).json({ message: `Invalid class_id: ${fields.class_id}` });
      updateReport();
    });
  } else {
    updateReport();
  }
});

// -------------------------
// DELETE a report
router.delete('/:id', auth(), (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ message: 'Access denied. Only lecturers can delete reports.' });
  }
  const reportId = req.params.id;
  if (!reportId) return res.status(400).json({ message: 'Report ID is required' });
  const sql = 'DELETE FROM reports WHERE id = ?';
  db.query(sql, [reportId], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Report not found' });
    res.json({ message: 'Report deleted successfully' });
  });
});

// -------------------------
// ADD feedback for a report (PRL)
router.post('/feedback/:id', auth(), (req, res) => {
  const reportId = req.params.id;
  const { feedback } = req.body;

  if (req.user.role !== 'prl') {
    return res.status(403).json({ message: 'Access denied. Only PRL can add feedback.' });
  }

  if (!feedback || !feedback.trim()) return res.status(400).json({ message: 'Feedback is required' });

  const sqlSelect = 'SELECT feedback FROM reports WHERE id = ?';
  db.query(sqlSelect, [reportId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'Report not found' });

    const existingFeedback = results[0].feedback || '';
    const updatedFeedback = existingFeedback
      ? `${existingFeedback}\n[PRL]: ${feedback}`
      : `[PRL]: ${feedback}`;

    const sqlUpdate = 'UPDATE reports SET feedback = ? WHERE id = ?';
    db.query(sqlUpdate, [updatedFeedback, reportId], (err2) => {
      if (err2) return res.status(500).json({ message: 'Database error', error: err2.message });
      res.json({ message: 'Feedback added successfully' });
    });
  });
});

// -------------------------
// EXPORT reports to Excel
router.get('/export', auth(), (req, res) => {
  if (req.user.role !== 'pl' && req.user.role !== 'prl') {
    return res.status(403).json({ message: 'Access denied. Only PL or PRL can export reports.' });
  }

  const sql = 'SELECT r.*, c.class_name, c.venue FROM reports r LEFT JOIN classes c ON r.class_id = c.class_id';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err.message });

    const worksheetData = results.map((r) => ({
      'Faculty Name': r.faculty_name,
      'Class ID': r.class_id,
      'Class Name': r.class_name,
      'Week of Reporting': r.week_of_reporting,
      'Date of Lecture': r.date_of_lecture,
      'Course Name': r.course_name,
      'Course Code': r.course_code,
      'Lecturer Name': r.lecturer_name,
      'Actual Students': r.actual_number_of_students_present,
      'Total Registered': r.total_number_of_registered_students,
      'Venue': r.venue,
      'Scheduled Time': r.scheduled_lecture_time,
      'Topic Taught': r.topic_taught,
      'Learning Outcomes': r.learning_outcomes,
      'Recommendations': r.recommendations,
      'Lecturer ID': r.lecturer_id,
      'Feedback': r.feedback || 'None'
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=Lecture_Reports.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  });
});

module.exports = router;







