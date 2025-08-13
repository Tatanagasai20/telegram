const express = require('express');
const router = express.Router();
const { authMiddleware, hrMiddleware } = require('../middleware/auth');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// @route   GET api/employees
// @desc    Get all employees
// @access  Private (HR only)
router.get('/', authMiddleware, hrMiddleware, async (req, res) => {
  try {
    const employees = await Employee.find().sort({ name: 1 });
    res.json(employees);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/employees/:id
// @desc    Get employee by ID
// @access  Private (HR only)
router.get('/:id', authMiddleware, hrMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/employees
// @desc    Create a new employee
// @access  Private (HR only)
router.post('/', authMiddleware, hrMiddleware, async (req, res) => {
  try {
    const { name, email, telegramId, telegramUsername, department, position, isHR } = req.body;
    
    // Check if employee with this email or telegramId already exists
    let employee = await Employee.findOne({ $or: [{ email }, { telegramId }] });
    if (employee) {
      return res.status(400).json({ message: 'Employee with this email or Telegram ID already exists' });
    }
    
    // Create new employee
    employee = new Employee({
      name,
      email,
      telegramId,
      telegramUsername,
      department,
      position,
      isHR: isHR || false
    });
    
    await employee.save();
    res.json(employee);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/employees/:id
// @desc    Update an employee
// @access  Private (HR only)
router.put('/:id', authMiddleware, hrMiddleware, async (req, res) => {
  try {
    const { name, email, telegramId, telegramUsername, department, position, isHR, isActive } = req.body;
    
    // Find employee by ID
    let employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check if updating to an email or telegramId that already exists
    if (email !== employee.email || telegramId !== employee.telegramId) {
      const existingEmployee = await Employee.findOne({
        $and: [
          { _id: { $ne: req.params.id } },
          { $or: [{ email }, { telegramId }] }
        ]
      });
      
      if (existingEmployee) {
        return res.status(400).json({ message: 'Email or Telegram ID already in use' });
      }
    }
    
    // Update employee fields
    if (name) employee.name = name;
    if (email) employee.email = email;
    if (telegramId) employee.telegramId = telegramId;
    if (telegramUsername !== undefined) employee.telegramUsername = telegramUsername;
    if (department !== undefined) employee.department = department;
    if (position !== undefined) employee.position = position;
    if (isHR !== undefined) employee.isHR = isHR;
    if (isActive !== undefined) employee.isActive = isActive;
    
    await employee.save();
    res.json(employee);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/employees/:id
// @desc    Delete an employee
// @access  Private (HR only)
router.delete('/:id', authMiddleware, hrMiddleware, async (req, res) => {
  try {
    // Find employee by ID
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Instead of deleting, set isActive to false
    employee.isActive = false;
    await employee.save();
    
    res.json({ message: 'Employee deactivated' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/employees/:id/attendance
// @desc    Get attendance records for a specific employee
// @access  Private (HR only)
router.get('/:id/attendance', authMiddleware, hrMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { employee: req.params.id };
    
    // Filter by date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const attendance = await Attendance.find(query)
      .populate('checkIn.modifiedBy', 'name')
      .populate('checkOut.modifiedBy', 'name')
      .sort({ date: -1 });
      
    res.json(attendance);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;