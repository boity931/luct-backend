const mysql = require('mysql');
const bcrypt = require('bcryptjs');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '', // empty if no password set in XAMPP
  database: 'luct-db',
  port: 3306
});

connection.connect(err => {
  if (err) {
    console.error('DB connection error:', err);
    process.exit(1);
  }

  const users = [
    { username: 'student1', plainPassword: 'student123', role: 'student' },
    { username: 'lecturer1', plainPassword: 'lecturer123', role: 'lecturer' },
    { username: 'pl1', plainPassword: 'pl123', role: 'pl' }, // Principal Lecturer
    { username: 'prl1', plainPassword: 'prl123', role: 'prl' } // Programme Leader/Year Leader
  ];

  users.forEach(user => {
    bcrypt.hash(user.plainPassword, 10, (err, hash) => {
      if (err) {
        console.error(`Error hashing password for ${user.username}:`, err);
        return;
      }

      connection.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password = ?, role = ?',
        [user.username, hash, user.role, hash, user.role],
        (error, results) => {
          if (error) {
            console.error(`DB error for ${user.username}:`, error);
          } else {
            console.log(`User "${user.username}" created/updated with role "${user.role}"`);
          }
        }
      );
    });
  });

  // Close connection after all operations
  setTimeout(() => connection.end(), 1000);
});



