const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  // Route Assignment
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: [true, 'Please provide route reference'],
    index: true
  },

  // Resource Assignment
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Please provide vehicle reference'],
    index: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: [true, 'Please provide driver reference'],
    index: true
  },

  // Scheduling
  scheduledDeparture: {
    type: Date,
    required: [true, 'Please provide scheduled departure time'],
    index: true
  },
  scheduledArrival: {
    type: Date,
    required: [true, 'Please provide scheduled arrival time'],
    validate: {
      // In create/save context, `this` is the document
      validator: function(value) {
        // During findByIdAndUpdate, `this` is the Query — use this.get()
        const dep = typeof this.get === 'function'
          ? this.get('scheduledDeparture')
          : this.scheduledDeparture;
        if (!dep) return true; // Can't compare without departure — controller handles it
        return value > dep;
      },
      message: 'Scheduled arrival must be after scheduled departure'
    }
  },
  actualDeparture: {
    type: Date
  },
  actualArrival: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value || !this.actualDeparture) return true;
        return value > this.actualDeparture;
      },
      message: 'Actual arrival must be after actual departure'
    }
  },

  // Status
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'in-progress', 'completed', 'cancelled', 'delayed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'scheduled',
    index: true
  },

  // Operational Details
  passengerCount: {
    type: Number,
    default: 0,
    min: [0, 'Passenger count cannot be negative']
  },
  fare: {
    type: Number,
    min: [0, 'Fare cannot be negative']
  },
  notes: {
    type: String,
    trim: true
  },

  // Cancellation/Delay
  cancellationReason: {
    type: String,
    trim: true
  },
  delayReason: {
    type: String,
    trim: true
  },
  delayDuration: {
    type: Number,
    min: [0, 'Delay duration cannot be negative']
  }
}, {
  timestamps: true
});

// Compound indexes for availability checks
tripSchema.index({ vehicle: 1, scheduledDeparture: 1 });
tripSchema.index({ driver: 1, scheduledDeparture: 1 });

// Pre-save middleware for validation
tripSchema.pre('save', function(next) {
  // Validate cancellation reason when status is cancelled
  if (this.status === 'cancelled' && !this.cancellationReason) {
    return next(new Error('Cancellation reason is required when status is cancelled'));
  }

  // Validate delay reason when status is delayed
  if (this.status === 'delayed' && !this.delayReason) {
    return next(new Error('Delay reason is required when status is delayed'));
  }

  next();
});

// Pre-update hook: validate scheduledArrival > scheduledDeparture
tripSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  const dep = update.scheduledDeparture;
  const arr = update.scheduledArrival;

  // Only validate when both are being changed simultaneously
  if (dep && arr) {
    if (new Date(arr) <= new Date(dep)) {
      return next(new Error('Scheduled arrival must be after scheduled departure'));
    }
  } else if (arr) {
    // Only arrival is changing — fetch existing departure from DB
    const doc = await this.model.findOne(this.getFilter()).select('scheduledDeparture');
    if (doc && new Date(arr) <= doc.scheduledDeparture) {
      return next(new Error('Scheduled arrival must be after scheduled departure'));
    }
  } else if (dep) {
    // Only departure is changing — fetch existing arrival from DB
    const doc = await this.model.findOne(this.getFilter()).select('scheduledArrival');
    if (doc && doc.scheduledArrival <= new Date(dep)) {
      return next(new Error('Scheduled arrival must be after scheduled departure'));
    }
  }

  next();
});

module.exports = mongoose.model('Trip', tripSchema);
