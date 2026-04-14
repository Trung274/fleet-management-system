const Driver = require('../models/Driver.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new driver
// @route   POST /api/v1/drivers
// @access  Private (drivers:create)
exports.createDriver = asyncHandler(async (req, res, next) => {
  const driver = await Driver.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Driver created successfully',
    data: driver
  });
});

// @desc    Get all drivers
// @route   GET /api/v1/drivers
// @access  Private (drivers:read)
exports.getAllDrivers = asyncHandler(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100); // Max 100
  const startIndex = (page - 1) * limit;

  // Build query
  const query = {};

  // Filter by employment status (comma-separated for multiple values)
  if (req.query.status) {
    const statuses = req.query.status.split(',').map(s => s.trim());
    query.employmentStatus = { $in: statuses };
  }

  // Filter by license type (comma-separated for multiple values)
  if (req.query.licenseType) {
    const licenseTypes = req.query.licenseType.split(',').map(t => t.trim());
    query.licenseType = { $in: licenseTypes };
  }

  // Search across firstName, lastName, email, and licenseNumber
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { licenseNumber: searchRegex }
    ];
  }

  // Sorting
  let sortBy = '-createdAt'; // Default sort
  if (req.query.sort) {
    sortBy = req.query.sort;
  }

  // Execute query
  const total = await Driver.countDocuments(query);
  const drivers = await Driver.find(query)
    .skip(startIndex)
    .limit(limit)
    .sort(sortBy);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  res.status(200).json({
    success: true,
    data: drivers,
    count: total,
    pagination: {
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev
    }
  });
});

// @desc    Get single driver by ID
// @route   GET /api/v1/drivers/:id
// @access  Private (drivers:read)
exports.getDriverById = asyncHandler(async (req, res, next) => {
  const driver = await Driver.findById(req.params.id);

  if (!driver) {
    return next(new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: driver
  });
});

// @desc    Update driver
// @route   PUT /api/v1/drivers/:id
// @access  Private (drivers:update)
exports.updateDriver = asyncHandler(async (req, res, next) => {
  // Find the existing driver
  const driver = await Driver.findById(req.params.id);

  if (!driver) {
    return next(new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404));
  }

  // Business rule: terminated drivers cannot change status
  if (driver.employmentStatus === 'terminated' && req.body.employmentStatus && req.body.employmentStatus !== 'terminated') {
    return next(new ErrorResponse('Cannot change status of terminated driver', 400));
  }

  // Update driver with new data
  const updatedDriver = await Driver.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: 'Driver updated successfully',
    data: updatedDriver
  });
});

// @desc    Delete driver
// @route   DELETE /api/v1/drivers/:id
// @access  Private (drivers:delete)
exports.deleteDriver = asyncHandler(async (req, res, next) => {
  const driver = await Driver.findByIdAndDelete(req.params.id);

  if (!driver) {
    return next(new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    message: 'Driver deleted successfully'
  });
});
