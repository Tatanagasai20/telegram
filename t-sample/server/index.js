const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const employeeRoutes = require('./routes/employee');
const dashboardRoutes = require('./routes/dashboard');

// Initialize express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Telegram Attendance Portal API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});