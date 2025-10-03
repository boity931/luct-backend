const express = require('express');
const router = express.Router();   // ✅ Create router instance
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).json({ msg: 'Server error' });
    if (results.length === 0) return res.status(400).json({ msg: 'User not found' });

    const user = results[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

      const payload = { id: user.id, role: user.role };
      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your_secret_key_here_change_this',
        { expiresIn: '1h' },
        (err, token) => {
          if (err) return res.status(500).json({ msg: 'Token generation failed' });
          res.json({ token });
        }
      );
    });
  });
});

// Register route for students
router.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || role !== 'student') {
    return res.status(400).json({ msg: 'Invalid registration data. Role must be student.' });
  }

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).json({ msg: 'Server error' });
    if (results.length > 0) return res.status(400).json({ msg: 'User already exists' });

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ msg: 'Hash error' });
      db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, 'student'], (err) => {
        if (err) return res.status(500).json({ msg: 'Registration failed' });
        res.status(201).json({ msg: 'User registered' });
      });
    });
  });
});

module.exports = router;   // ✅ Export router so server.js can use it // ✅ Export router so server.js can use it
