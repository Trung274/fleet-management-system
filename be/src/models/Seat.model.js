const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: [true, 'Please provide trip reference'],
    index: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Please provide vehicle reference']
  },
  seatNumber: {
    type: Number,
    required: [true, 'Please provide seat number'],
    min: [1, 'Seat number must be at least 1']
  },
  type: {
    type: String,
    enum: {
      values: ['standard', 'window', 'aisle', 'priority'],
      message: '{VALUE} is not a valid seat type'
    },
    default: 'standard'
  },
  status: {
    type: String,
    enum: {
      values: ['available', 'reserved', 'booked', 'unavailable'],
      message: '{VALUE} is not a valid seat status'
    },
    default: 'available',
    index: true
  }
}, {
  timestamps: true
});

// Compound unique index: one seatNumber per trip
seatSchema.index({ trip: 1, seatNumber: 1 }, { unique: true });

// For availability queries
seatSchema.index({ trip: 1, status: 1 });

module.exports = mongoose.model('Seat', seatSchema);
