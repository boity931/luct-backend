const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// ✅ GET /api/classes
// List classes with optional search (accessible by lecturer, pl, prl)
router.get('/', auth(['lecturer', 'pl', 'prl']), (req, res) => {
  const rawSearch = req.query.q || '';
  const search = `%${rawSearch}%`;

  const sql = `
    SELECT class_id, class_name, venue, updated_at 
    FROM classes
    WHERE class_name LIKE ?
    ORDER BY class_name ASC
  `;

  db.query(sql, [search], (err, results) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
});

// ✅ POST /api/classes
// Create a new class (lecturer only)
router.post('/', auth(['lecturer']), (req, res) => {
  const { class_name, venue } = req.body;

  if (!class_name) {
    return res.status(400).json({ message: 'class_name is required' });
  }

  const sql = 'INSERT INTO classes (class_name, venue, updated_at) VALUES (?, ?, NOW())';
  db.query(sql, [class_name, venue || null], (err, result) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }

    res.status(201).json({ message: 'Class created successfully', class_id: result.insertId });
  });
});

// ✅ PUT /api/classes/:id
// Update a class (lecturer only)
router.put('/:id', auth(['lecturer']), (req, res) => {
  const classId = req.params.id;
  const { class_name, venue } = req.body;

  if (!class_name && !venue) {
    return res.status(400).json({ message: 'At least one of class_name or venue is required' });
  }

  db.beginTransaction((err) => {
    if (err) {
      console.error('❌ Transaction error:', err);
      return res.status(500).json({ message: 'Error starting transaction' });
    }

    db.query('SELECT class_id FROM classes WHERE class_id = ?', [classId], (err, results) => {
      if (err) {
        return db.rollback(() => res.status(500).json({ message: 'Error checking class: ' + err.message }));
      }
      if (results.length === 0) {
        return db.rollback(() => res.status(404).json({ message: 'Class not found' }));
      }

      const updates = [];
      const values = [];
      if (class_name) {
        updates.push('class_name = ?');
        values.push(class_name);
      }
      if (venue !== undefined) {
        updates.push('venue = ?');
        values.push(venue);
      }
      updates.push('updated_at = NOW()');

      const sql = `UPDATE classes SET ${updates.join(', ')} WHERE class_id = ?`;
      values.push(classId);

      db.query(sql, values, (err) => {
        if (err) {
          return db.rollback(() => res.status(500).json({ message: 'Error updating class: ' + err.message }));
        }

        db.commit((err) => {
          if (err) {
            return db.rollback(() => res.status(500).json({ message: 'Error committing transaction: ' + err.message }));
          }
          res.json({ message: 'Class updated successfully' });
        });
      });
    });
  });
});

// ✅ DELETE /api/classes/:id
// Delete a class (lecturer only), restricted by foreign key constraints
router.delete('/:id', auth(['lecturer']), (req, res) => {
  const classId = req.params.id;

  db.query('DELETE FROM classes WHERE class_id = ?', [classId], (err, result) => {
    if (err) {
      console.error('❌ Database error:', err);
      if (err.code === 'ER_ROW_IS_REFERENCED_') {
        return res.status(400).json({ message: 'Cannot delete class because it is referenced by existing reports' });
      }
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json({ message: 'Class deleted successfully' });
  });
});

module.exports = router;


