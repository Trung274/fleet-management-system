const Permission = require('../models/Permission.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all permissions
// @route   GET /api/v1/permissions
// @access  Private/Admin
exports.getAllPermissions = asyncHandler(async (req, res, next) => {
  // Group by resource
  const groupByResource = req.query.grouped === 'true';

  const permissions = await Permission.find().sort('resource action');

  if (groupByResource) {
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      count: permissions.length,
      data: grouped
    });
  }

  res.status(200).json({
    success: true,
    count: permissions.length,
    data: permissions
  });
});

// @desc    Get single permission
// @route   GET /api/v1/permissions/:id
// @access  Private/Admin
exports.getPermissionById = asyncHandler(async (req, res, next) => {
  const permission = await Permission.findById(req.params.id);

  if (!permission) {
    return next(new ErrorResponse(`Permission not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: permission
  });
});

// @desc    Create permission
// @route   POST /api/v1/permissions
// @access  Private/Admin
exports.createPermission = asyncHandler(async (req, res, next) => {
  const { resource, action, description } = req.body;

  const permExists = await Permission.findOne({ resource, action });
  if (permExists) {
    return next(new ErrorResponse('Permission already exists', 400));
  }

  const permission = await Permission.create({
    resource,
    action,
    description
  });

  res.status(201).json({
    success: true,
    message: 'Permission created successfully',
    data: permission
  });
});

// @desc    Update permission
// @route   PUT /api/v1/permissions/:id
// @access  Private/Admin
exports.updatePermission = asyncHandler(async (req, res, next) => {
  const { description, isActive } = req.body;

  const permission = await Permission.findByIdAndUpdate(
    req.params.id,
    { description, isActive },
    {
      new: true,
      runValidators: true
    }
  );

  if (!permission) {
    return next(new ErrorResponse(`Permission not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    message: 'Permission updated successfully',
    data: permission
  });
});

// @desc    Delete permission
// @route   DELETE /api/v1/permissions/:id
// @access  Private/Admin
exports.deletePermission = asyncHandler(async (req, res, next) => {
  const permission = await Permission.findById(req.params.id);

  if (!permission) {
    return next(new ErrorResponse(`Permission not found with id of ${req.params.id}`, 404));
  }

  await permission.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Permission deleted successfully',
    data: {}
  });
});