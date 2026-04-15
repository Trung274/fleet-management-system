const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  registrationNumber: {
    type: String,
    required: [true, 'Please provide a registration number'],
    unique: true,
    trim: true,
    uppercase: true
  },
  make: {
    type: String,
    required: [true, 'Please provide a vehicle make'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Please provide a vehicle model'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Please provide a vehicle year'],
    min: [1900, 'Year must be 1900 or later'],
    max: [new Date().getFullYear() + 1, `Year cannot be later than ${new Date().getFullYear() + 1}`]
  },
  capacity: {
    type: Number,
    required: [true, 'Please provide vehicle capacity'],
    min: [1, 'Capacity must be at least 1']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'maintenance', 'out-of-service', 'retired'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  color: {
    type: String,
    trim: true
  },
  vin: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
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
// Note: registrationNumber index is created automatically by unique: true
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
