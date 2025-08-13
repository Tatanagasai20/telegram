const express = require('express');
const router = express.Router();
const { authMiddleware, hrMiddleware } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// @route   GET api/attendance
// @desc    Get all attendance records
// @access  Private (HR only)
router.get('/', authMiddleware, hrMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    let query = {};
    
    // Filter by date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Filter by employee if provided
    if (employeeId) {
      query.employee = employeeId;
    }
    
    const attendance = await Attendance.find(query)
      .populate('employee', 'name email telegramId department position')
      .populate('checkIn.modifiedBy', 'name')
      .populate('checkOut.modifiedBy', 'name')
      .sort({ date: -1 });
      
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/attendance/:id
// @desc    Get attendance record by ID
// @access  Private (HR only)
router.get('/:id', authMiddleware, hrMiddleware, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'name email telegramId department position')
      .populate('checkIn.modifiedBy', 'name')
      .populate('checkOut.modifiedBy', 'name');
      
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/attendance/check-in
// @desc    Record employee check-in (used by Telegram bot)
// @access  Public (with validation)
router.post('/check-in', async (req, res) => {
  try {
    const { telegramId } = req.body;
    
    // Find employee by Telegram ID
    const employee = await Employee.findOne({ telegramId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Get today's date (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if attendance record for today already exists
    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (attendance) {
      // If already checked in
      if (attendance.checkIn.time) {
        return res.status(400).json({ message: 'Already checked in today' });
      }
      
      // Update existing record with check-in time
      attendance.checkIn.time = new Date();
      attendance.status = 'present';
    } else {
      // Create new attendance record
      attendance = new Attendance({
        employee: employee._id,
        date: today,
        checkIn: {
          time: new Date()
        },
        status: 'present'
      });
    }
    
    await attendance.save();
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/attendance/check-out
// @desc    Record employee check-out (used by Telegram bot)
// @access  Public (with validation)
router.post('/check-out', async (req, res) => {
  try {
    const { telegramId } = req.body;
    
    // Find employee by Telegram ID
    const employee = await Employee.findOne({ telegramId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Get today's date (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (!attendance) {
      return res.status(404).json({ message: 'No check-in record found for today' });
    }
    
    if (!attendance.checkIn.time) {
      return res.status(400).json({ message: 'Must check in before checking out' });
    }
    
    if (attendance.checkOut.time) {
      return res.status(400).json({ message: 'Already checked out today' });
    }
    
    // Record check-out time
    const checkOutTime = new Date();
    attendance.checkOut.time = checkOutTime;
    
    // Calculate total hours worked
    const checkInTime = new Date(attendance.checkIn.time);
    const diffMs = checkOutTime - checkInTime;
    const diffHrs = diffMs / (1000 * 60 * 60);
    attendance.totalHours = parseFloat(diffHrs.toFixed(2));
    
    await attendance.save();
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/attendance/:id
// @desc    Update attendance record (HR only)
// @access  Private
router.put('/:id', authMiddleware, hrMiddleware, async (req, res) => {
  try {
    const { checkIn, checkOut, status, notes } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Update check-in time if provided
    if (checkIn && checkIn.time) {
      const newCheckInTime = new Date(checkIn.time);
      
      // Store original time if this is the first modification
      if (!attendance.checkIn.originalTime && attendance.checkIn.time) {
        attendance.checkIn.originalTime = attendance.checkIn.time;
      }
      
      attendance.checkIn.time = newCheckInTime;
      attendance.checkIn.modifiedBy = req.user.id;
      attendance.checkIn.modifiedAt = new Date();
    }
    
    // Update check-out time if provided
    if (checkOut && checkOut.time) {
      const newCheckOutTime = new Date(checkOut.time);
      
      // Store original time if this is the first modification
      if (!attendance.checkOut.originalTime && attendance.checkOut.time) {
        attendance.checkOut.originalTime = attendance.checkOut.time;
      }
      
      attendance.checkOut.time = newCheckOutTime;
      attendance.checkOut.modifiedBy = req.user.id;
      attendance.checkOut.modifiedAt = new Date();
    }
    
    // Recalculate total hours if both check-in and check-out times exist
    if (attendance.checkIn.time && attendance.checkOut.time) {
      const checkInTime = new Date(attendance.checkIn.time);
      const checkOutTime = new Date(attendance.checkOut.time);
      const diffMs = checkOutTime - checkInTime;
      const diffHrs = diffMs / (1000 * 60 * 60);
      attendance.totalHours = parseFloat(diffHrs.toFixed(2));
    }
    
    // Update status if provided
    if (status) {
      attendance.status = status;
    }
    
    // Update notes if provided
    if (notes !== undefined) {
      attendance.notes = notes;
    }
    
    await attendance.save();
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;