const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Passenger name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Passenger phone is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  idNumber: {
    type: String,
    trim: true
  }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: [true, 'Please provide trip reference'],
    index: true
  },
  seat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: [true, 'Please provide seat reference'],
    index: true
  },
  passenger: {
    type: passengerSchema,
    required: [true, 'Passenger information is required']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'cancelled'],
      message: '{VALUE} is not a valid booking status'
    },
    default: 'pending',
    index: true
  },
  fare: {
    type: Number,
    min: [0, 'Fare cannot be negative']
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  bookedAt: {
    type: Date
  },
  confirmedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for passenger search
bookingSchema.index({ 'passenger.phone': 1 });
bookingSchema.index({ 'passenger.name': 1 });

// Set bookedAt on creation
bookingSchema.pre('save', function(next) {
  if (this.isNew && !this.bookedAt) {
    this.bookedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
