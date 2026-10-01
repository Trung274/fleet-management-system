const mongoose = require('mongoose');

// A planned or ongoing period when a vehicle is in the garage and cannot run trips
const maintenanceRecordSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Please provide vehicle reference'],
    index: true
  },
  type: {
    type: String,
    enum: {
      values: ['periodic', 'repair', 'inspection'],
      message: '{VALUE} is not a valid maintenance type'
    },
    required: [true, 'Please provide maintenance type']
  },
  scheduledStart: {
    type: Date,
    required: [true, 'Please provide scheduled start']
  },
  scheduledEnd: {
    type: Date,
    required: [true, 'Please provide scheduled end'],
    validate: {
      validator: function(value) {
        const start = typeof this.get === 'function' ? this.get('scheduledStart') : this.scheduledStart;
        return !start || value > start;
      },
      message: 'Scheduled end must be after scheduled start'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      message: '{VALUE} is not a valid maintenance status'
    },
    default: 'scheduled',
    index: true
  },
  garage: { type: String, trim: true },
  cost: { type: Number, min: [0, 'Cost cannot be negative'] },
  notes: { type: String, trim: true },
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: { type: String, trim: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Overlap checks: vehicle + time window
maintenanceRecordSchema.index({ vehicle: 1, scheduledStart: 1 });

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);
