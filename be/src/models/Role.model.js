const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a role name'],
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['admin', 'manager', 'staff', 'user'], // Có thể thêm roles khác sau
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

// Note: name index is created automatically by unique: true

// Populate permissions khi query
roleSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'permissions',
    select: 'resource action description isActive'
  });
  next();
});

module.exports = mongoose.model('Role', roleSchema);