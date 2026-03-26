const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a role name'],
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['admin', 'user'], // Có thể thêm roles khác sau
  },
  description: {
    type: String,
    trim: true
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index cho performance
roleSchema.index({ name: 1 });

// Populate permissions khi query
roleSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'permissions',
    select: 'resource action description'
  });
  next();
});

module.exports = mongoose.model('Role', roleSchema);