require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const reportsRoutes = require('./routes/reports');
const coursesRoutes = require('./routes/courses');
const lecturesRoutes = require('./routes/lectures');
const classesRoutes = require('./routes/classes');
const ratingRoutes = require('./routes/rating');
const monitoringRoutes = require('./routes/monitoring');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/lectures', lecturesRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api', ratingRoutes); // ✅ changed from '/api/rating' to '/api'
// keeps your frontend calls like /api/lectures-to-rate and /api/rating working
app.use('/api/monitoring', monitoringRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});





