const mongoose = require('mongoose');
const validator = require('validator');

const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  relationship: {
    type: String,
    trim: true
  }
}, { _id: false });

const driverSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'Please provide first name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please provide last name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide email address'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Please provide phone number'],
    trim: true
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value) {
        return value < new Date();
      },
      message: 'Date of birth must be in the past'
    }
  },
  address: {
    type: String,
    trim: true
  },

  // License Information
  licenseNumber: {
    type: String,
    required: [true, 'Please provide license number'],
    unique: true,
    trim: true,
    uppercase: true
  },
  licenseType: {
    type: String,
    required: [true, 'Please provide license type'],
    enum: {
      values: ['Class A', 'Class B', 'Class C'],
      message: '{VALUE} is not a valid license type'
    }
  },
  licenseExpiry: {
    type: Date,
    required: [true, 'Please provide license expiry date'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'License expiry date must be in the future'
    }
  },

  // Employment Information
  employmentStatus: {
    type: String,
    enum: {
      values: ['active', 'on-leave', 'suspended', 'terminated'],
      message: '{VALUE} is not a valid employment status'
    },
    default: 'active'
  },
  hireDate: {
    type: Date
  },
  terminationDate: {
    type: Date
  },

  // Emergency Contact
  emergencyContact: emergencyContactSchema,

  // Additional Information
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
// Note: licenseNumber and email indexes are created automatically by unique: true
driverSchema.index({ employmentStatus: 1 });
driverSchema.index({ createdAt: -1 });

// Pre-save middleware to set terminationDate when status changes to terminated
driverSchema.pre('save', function(next) {
  if (this.isModified('employmentStatus') && this.employmentStatus === 'terminated') {
    if (!this.terminationDate) {
      this.terminationDate = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('Driver', driverSchema);
