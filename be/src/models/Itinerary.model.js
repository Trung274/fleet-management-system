const mongoose = require('mongoose');
const { passengerSchema } = require('./Booking.model');

// A multi-trip journey for one passenger: each leg is a Booking on a different trip
const itinerarySchema = new mongoose.Schema({
  passenger: {
    type: passengerSchema,
    required: [true, 'Passenger information is required']
  },
  // Bookings in travel order
  legs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'cancelled'],
      message: '{VALUE} is not a valid itinerary status'
    },
    default: 'pending',
    index: true
  },
  totalFare: {
    type: Number,
    min: [0, 'Total fare cannot be negative'],
    default: 0
  },
  cancellationReason: {
    type: String,
    trim: true
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

itinerarySchema.index({ 'passenger.phone': 1 });

module.exports = mongoose.model('Itinerary', itinerarySchema);
