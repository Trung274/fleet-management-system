const Vehicle = require('../models/Vehicle.model');
const Trip = require('../models/Trip.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Escape special regex characters to prevent ReDoS attacks
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Create new vehicle
// @route   POST /api/v1/vehicles
// @access  Private (vehicles:create)
exports.createVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Vehicle created successfully',
    data: vehicle
  });
});

// @desc    Get all vehicles
// @route   GET /api/v1/vehicles
// @access  Private (vehicles:read)
exports.getAllVehicles = asyncHandler(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100); // Max 100
  const startIndex = (page - 1) * limit;

  // Build query
  const query = {};

  // Filter by status (comma-separated for multiple values)
  if (req.query.status) {
    const statuses = req.query.status.split(',').map(s => s.trim());
    query.status = { $in: statuses };
  }

  // Search across registrationNumber, make, and model
  if (req.query.search) {
    const searchRegex = new RegExp(escapeRegex(req.query.search), 'i');
    query.$or = [
      { registrationNumber: searchRegex },
      { make: searchRegex },
      { model: searchRegex }
    ];
  }

  // Sorting
  let sortBy = '-createdAt'; // Default sort
  if (req.query.sort) {
    sortBy = req.query.sort;
  }

  // Execute query
  const total = await Vehicle.countDocuments(query);
  const vehicles = await Vehicle.find(query)
    .skip(startIndex)
    .limit(limit)
    .sort(sortBy);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  res.status(200).json({
    success: true,
    data: vehicles,
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

// @desc    Get single vehicle by ID
// @route   GET /api/v1/vehicles/:id
// @access  Private (vehicles:read)
exports.getVehicleById = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return next(new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: vehicle
  });
});

// @desc    Update vehicle
// @route   PUT /api/v1/vehicles/:id
// @access  Private (vehicles:update)
exports.updateVehicle = asyncHandler(async (req, res, next) => {
  // Find the existing vehicle
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return next(new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404));
  }

  // Business rule: retired vehicles cannot change status
  if (vehicle.status === 'retired' && req.body.status && req.body.status !== 'retired') {
    return next(new ErrorResponse('Cannot change status of a retired vehicle', 400));
  }

  // Update vehicle with new data
  const updatedVehicle = await Vehicle.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: 'Vehicle updated successfully',
    data: updatedVehicle
  });
});

// @desc    Delete vehicle
// @route   DELETE /api/v1/vehicles/:id
// @access  Private (vehicles:delete)
exports.deleteVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return next(new ErrorResponse(`Vehicle not found with id of ${req.params.id}`, 404));
  }

  // Check for active or scheduled trips before deleting
  const activeTrip = await Trip.findOne({
    vehicle: req.params.id,
    status: { $in: ['scheduled', 'in-progress', 'delayed'] }
  });
  if (activeTrip) {
    return next(new ErrorResponse('Cannot delete vehicle that has active or scheduled trips', 400));
  }

  await vehicle.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Vehicle deleted successfully'
  });
});
