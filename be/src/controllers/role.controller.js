const Role = require('../models/Role.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all roles
// @route   GET /api/v1/roles
// @access  Private/Admin
exports.getAllRoles = asyncHandler(async (req, res, next) => {
  const roles = await Role.find().sort('name');

  res.status(200).json({
    success: true,
    count: roles.length,
    data: roles
  });
});

// @desc    Get single role
// @route   GET /api/v1/roles/:id
// @access  Private/Admin
exports.getRoleById = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc    Create role
// @route   POST /api/v1/roles
// @access  Private/Admin
exports.createRole = asyncHandler(async (req, res, next) => {
  const { name, description, permissions } = req.body;

  const roleExists = await Role.findOne({ name });
  if (roleExists) {
    return next(new ErrorResponse('Role already exists', 400));
  }

  const role = await Role.create({
    name,
    description,
    permissions
  });

  res.status(201).json({
    success: true,
    message: 'Role created successfully',
    data: role
  });
});

// @desc    Update role
// @route   PUT /api/v1/roles/:id
// @access  Private/Admin
exports.updateRole = asyncHandler(async (req, res, next) => {
  const { description, permissions, isActive } = req.body;

  const role = await Role.findByIdAndUpdate(
    req.params.id,
    { description, permissions, isActive },
    {
      new: true,
      runValidators: true
    }
  );

  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    message: 'Role updated successfully',
    data: role
  });
});

// @desc    Delete role
// @route   DELETE /api/v1/roles/:id
// @access  Private/Admin
exports.deleteRole = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }

  // Không cho xóa role mặc định
  if (['admin', 'user'].includes(role.name)) {
    return next(new ErrorResponse('Cannot delete default system roles', 400));
  }

  await role.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Role deleted successfully',
    data: {}
  });
});