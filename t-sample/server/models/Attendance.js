const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  checkIn: {
    time: {
      type: Date,
      required: true
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    originalTime: {
      type: Date,
      default: null
    },
    modifiedAt: {
      type: Date,
      default: null
    }
  },
  checkOut: {
    time: {
      type: Date,
      default: null
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    originalTime: {
      type: Date,
      default: null
    },
    modifiedAt: {
      type: Date,
      default: null
    }
  },
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'pending'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  }
});

// Create a compound index for employee and date to ensure uniqueness
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);