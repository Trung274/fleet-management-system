const mongoose = require('mongoose');

const coordinatesSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    validate: {
      validator: function(value) {
        return value >= -90 && value <= 90;
      },
      message: 'Invalid latitude value'
    }
  },
  longitude: {
    type: Number,
    validate: {
      validator: function(value) {
        return value >= -180 && value <= 180;
      },
      message: 'Invalid longitude value'
    }
  }
}, { _id: false });

const routeStopSchema = new mongoose.Schema({
  // Route Reference
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: [true, 'Please provide route reference']
  },

  // Stop Information
  stopName: {
    type: String,
    required: [true, 'Please provide stop name'],
    trim: true
  },
  stopCode: {
    type: String,
    required: [true, 'Please provide stop code'],
    trim: true,
    uppercase: true
  },
  address: {
    type: String,
    trim: true
  },

  // Sequence and Distance
  sequence: {
    type: Number,
    required: [true, 'Please provide sequence'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Sequence must be greater than 0'
    }
  },
  distanceFromStart: {
    type: Number,
    default: 0,
    validate: {
      validator: function(value) {
        return value >= 0;
      },
      message: 'Distance from start must be 0 or greater'
    }
  },

  // Timing
  estimatedArrivalTime: {
    type: Number
  },
  estimatedDepartureTime: {
    type: Number
  },

  // Location
  coordinates: coordinatesSchema
}, {
  timestamps: true
});

// Compound index for route and sequence (unique together)
routeStopSchema.index({ route: 1, sequence: 1 }, { unique: true });

module.exports = mongoose.model('RouteStop', routeStopSchema);
