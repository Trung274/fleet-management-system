const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  resource: {
    type: String,
    required: [true, 'Please provide a resource name'],
    trim: true,
    lowercase: true
    // Ví dụ: 'users', 'posts', 'comments'
  },
  action: {
    type: String,
    required: [true, 'Please provide an action'],
    trim: true,
    lowercase: true
    // Ví dụ: 'create', 'read', 'update', 'delete', 'list'
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Composite index - mỗi permission là unique theo resource + action
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

// Virtual field để có tên đầy đủ
permissionSchema.virtual('fullName').get(function() {
  return `${this.resource}:${this.action}`;
});

module.exports = mongoose.model('Permission', permissionSchema);