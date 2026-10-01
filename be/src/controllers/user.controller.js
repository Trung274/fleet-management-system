const User = require('../models/User.model');
const Role = require('../models/Role.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Filters: ?search= (name/email), ?role=<role name>, ?status=active|inactive
  const filter = {};
  if (req.query.search) {
    const escaped = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } }
    ];
  }
  if (req.query.role) {
    const role = await Role.findOne({ name: req.query.role });
    filter.role = role ? role._id : null; // unknown role → no results
  }
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .skip(startIndex)
    .limit(limit)
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  // Users can only view their own profile unless they're admin
  if (req.user.id !== req.params.id && req.user.role.name !== 'admin') {
    return next(new ErrorResponse('Not authorized to view this user', 403));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private
exports.updateUser = asyncHandler(async (req, res, next) => {
  // Users can only update their own profile unless they're admin
  if (req.user.id !== req.params.id && req.user.role.name !== 'admin') {
    return next(new ErrorResponse('Not authorized to update this user', 403));
  }

  // Fields that can be updated
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email
  };

  const isAdmin = req.user.role.name === 'admin';
  const isSelf = req.user.id === req.params.id;

  // Only admin can update role — but not their own (could lock themselves out)
  if (isAdmin && req.body.role) {
    if (isSelf) {
      return next(new ErrorResponse('You cannot change your own role', 400));
    }
    const role = await Role.findById(req.body.role);
    if (!role) {
      return next(new ErrorResponse('Role not found', 400));
    }
    fieldsToUpdate.role = role._id;
  }

  // Only admin can lock / unlock an account — but not their own
  if (isAdmin && req.body.isActive !== undefined) {
    const isActive = req.body.isActive === true || req.body.isActive === 'true';
    if (isSelf && !isActive) {
      return next(new ErrorResponse('You cannot deactivate your own account', 400));
    }
    fieldsToUpdate.isActive = isActive;
    // Locking signs the user out everywhere: protect() rejects inactive users on every
    // request, and clearing refresh tokens stops new access tokens being issued
    if (!isActive) {
      fieldsToUpdate.refreshTokens = [];
    }
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  );

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  if (req.user.id === req.params.id) {
    return next(new ErrorResponse('You cannot delete your own account', 400));
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
    data: {}
  });
});