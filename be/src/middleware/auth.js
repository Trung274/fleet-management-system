const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User.model');

// Protect routes - verify JWT token
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (!req.user.isActive) {
      return next(new ErrorResponse('User account is deactivated', 401));
    }

    if (req.user.changedPasswordAfter(decoded.iat)) {
      return next(new ErrorResponse('Password recently changed. Please log in again', 401));
    }

    next();
  } catch (error) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

// Authorize by role name (backward compatible)
exports.authorize = (...roleNames) => {
  return (req, res, next) => {
    if (!req.user.role) {
      return next(new ErrorResponse('User role not found', 403));
    }

    const userRoleName = req.user.role.name;
    
    if (!roleNames.includes(userRoleName)) {
      return next(
        new ErrorResponse(
          `User role '${userRoleName}' is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check specific permission
exports.checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('User not authenticated', 401));
    }

    // Admin có tất cả quyền
    if (req.user.role.name === 'admin') {
      return next();
    }

    // Kiểm tra permission cụ thể
    if (!req.user.hasPermission(resource, action)) {
      return next(
        new ErrorResponse(
          `You don't have permission to ${action} ${resource}`,
          403
        )
      );
    }

    next();
  };
};

// Check any of multiple permissions (OR logic)
exports.checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('User not authenticated', 401));
    }

    if (req.user.role.name === 'admin') {
      return next();
    }

    if (!req.user.hasAnyPermission(permissions)) {
      return next(
        new ErrorResponse('You don\'t have required permissions', 403)
      );
    }

    next();
  };
};

// Middleware to prevent self-registration (chỉ admin tạo user)
exports.restrictUserCreation = (req, res, next) => {
  // Nếu đã login và là admin -> OK
  if (req.user && req.user.role.name === 'admin') {
    return next();
  }
  
  // Nếu không có user (tức là đang cố tự đăng ký) -> Reject
  return next(new ErrorResponse('User registration is disabled. Contact administrator.', 403));
};