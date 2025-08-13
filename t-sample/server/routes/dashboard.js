const express = require('express');
const router = express.Router();
const { authMiddleware, hrMiddleware } = require('../middleware/auth');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  HR
router.get('/stats', [authMiddleware, hrMiddleware], async (req, res) => {
  try {
    // Get today's date (start and end)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total employees count
    const totalEmployees = await Employee.countDocuments({ isActive: true });

    // Get present employees count (checked in today)
    const presentEmployees = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $exists: true, $ne: null }
    });

    // Get absent employees count
    const absentEmployees = totalEmployees - presentEmployees;

    // Get late employees count
    const workStartTime = new Date(today);
    workStartTime.setHours(9, 0, 0, 0); // Assuming work starts at 9 AM

    const lateEmployees = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      checkIn: { $exists: true, $ne: null, $gt: workStartTime }
    });

    // Get average working hours for the past week
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const attendanceRecords = await Attendance.find({
      date: { $gte: oneWeekAgo, $lt: tomorrow },
      totalHours: { $exists: true, $ne: null }
    });

    let totalHours = 0;
    let recordCount = 0;

    attendanceRecords.forEach(record => {
      if (record.totalHours) {
        totalHours += record.totalHours;
        recordCount++;
      }
    });

    const averageHours = recordCount > 0 ? (totalHours / recordCount).toFixed(2) : 0;

    // Return statistics
    res.json({
      totalEmployees,
      presentEmployees,
      absentEmployees,
      lateEmployees,
      averageHours
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;