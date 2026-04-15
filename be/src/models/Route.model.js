const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide route name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide route code'],
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },

  // Geography
  origin: {
    type: String,
    required: [true, 'Please provide origin'],
    trim: true
  },
  destination: {
    type: String,
    required: [true, 'Please provide destination'],
    trim: true
  },
  distance: {
    type: Number,
    required: [true, 'Please provide distance'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Distance must be greater than 0'
    }
  },

  // Operational
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'under-maintenance', 'discontinued'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  serviceType: {
    type: String,
    enum: {
      values: ['express', 'local', 'shuttle'],
      message: '{VALUE} is not a valid service type'
    },
    default: 'local'
  },
  estimatedDuration: {
    type: Number,
    required: [true, 'Please provide estimated duration'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Estimated duration must be greater than 0'
    }
  },
  discontinuedDate: {
    type: Date
  },

  // Route Stops
  stops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RouteStop'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
// Note: code index is created automatically by unique: true
routeSchema.index({ status: 1 });
routeSchema.index({ createdAt: -1 });

// Pre-remove middleware to cascade delete associated route stops
routeSchema.pre('remove', async function(next) {
  try {
    await mongoose.model('RouteStop').deleteMany({ route: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set discontinuedDate when status changes to discontinued
routeSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'discontinued') {
    if (!this.discontinuedDate) {
      this.discontinuedDate = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('Route', routeSchema);
