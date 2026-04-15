const Trip = require('../models/Trip.model');
const Route = require('../models/Route.model');
const Vehicle = require('../models/Vehicle.model');
const Driver = require('../models/Driver.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Helper function to check vehicle availability
const checkVehicleAvailability = async (vehicleId, scheduledDeparture, scheduledArrival, excludeTripId = null) => {
  const query = {
    vehicle: vehicleId,
    status: { $nin: ['cancelled', 'completed'] },
    $or: [
      // New trip starts during existing trip
      { scheduledDeparture: { $lte: scheduledDeparture }, scheduledArrival: { $gt: scheduledDeparture } },
      // New trip ends during existing trip
      { scheduledDeparture: { $lt: scheduledArrival }, scheduledArrival: { $gte: scheduledArrival } },
      // New trip contains existing trip
      { scheduledDeparture: { $gte: scheduledDeparture }, scheduledArrival: { $lte: scheduledArrival } },
      // Existing trip contains new trip
      { scheduledDeparture: { $lte: scheduledDeparture }, scheduledArrival: { $gte: scheduledArrival } }
    ]
  };

  if (excludeTripId) {
    query._id = { $ne: excludeTripId };
  }

  const overlappingTrips = await Trip.find(query);
  return overlappingTrips.length === 0;
};

// Helper function to check driver availability
const checkDriverAvailability = async (driverId, scheduledDeparture, scheduledArrival, excludeTripId = null) => {
  const query = {
    driver: driverId,
    status: { $nin: ['cancelled', 'completed'] },
    $or: [
      { scheduledDeparture: { $lte: scheduledDeparture }, scheduledArrival: { $gt: scheduledDeparture } },
      { scheduledDeparture: { $lt: scheduledArrival }, scheduledArrival: { $gte: scheduledArrival } },
      { scheduledDeparture: { $gte: scheduledDeparture }, scheduledArrival: { $lte: scheduledArrival } },
      { scheduledDeparture: { $lte: scheduledDeparture }, scheduledArrival: { $gte: scheduledArrival } }
    ]
  };

  if (excludeTripId) {
    query._id = { $ne: excludeTripId };
  }

  const overlappingTrips = await Trip.find(query);
  return overlappingTrips.length === 0;
};

// Helper function to validate status transition
const validateStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    scheduled: ['in-progress', 'cancelled', 'delayed'],
    delayed: ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

// @desc    Create new trip
// @route   POST /api/v1/trips
// @access  Private (trips:create)
exports.createTrip = asyncHandler(async (req, res, next) => {
  const { route, vehicle, driver, scheduledDeparture, scheduledArrival, fare, notes } = req.body;

  // Validate required fields
  if (!route || !vehicle || !driver || !scheduledDeparture || !scheduledArrival) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }

  // Check if route exists and is active
  const routeDoc = await Route.findById(route);
  if (!routeDoc) {
    return next(new ErrorResponse('Route not found', 404));
  }
  if (routeDoc.status !== 'active') {
    return next(new ErrorResponse('Route is not active', 400));
  }

  // Check if vehicle exists and is active
  const vehicleDoc = await Vehicle.findById(vehicle);
  if (!vehicleDoc) {
    return next(new ErrorResponse('Vehicle not found', 404));
  }
  if (vehicleDoc.status !== 'active') {
    return next(new ErrorResponse('Vehicle is not active', 400));
  }

  // Check if driver exists and is active
  const driverDoc = await Driver.findById(driver);
  if (!driverDoc) {
    return next(new ErrorResponse('Driver not found', 404));
  }
  if (driverDoc.employmentStatus !== 'active') {
    return next(new ErrorResponse('Driver is not active', 400));
  }

  // Validate scheduled times
  const depTime = new Date(scheduledDeparture);
  const arrTime = new Date(scheduledArrival);
  
  if (depTime <= new Date()) {
    return next(new ErrorResponse('Scheduled departure must be in the future', 400));
  }
  
  if (arrTime <= depTime) {
    return next(new ErrorResponse('Scheduled arrival must be after scheduled departure', 400));
  }

  // Check vehicle availability
  const vehicleAvailable = await checkVehicleAvailability(vehicle, depTime, arrTime);
  if (!vehicleAvailable) {
    return next(new ErrorResponse('Vehicle is not available for the selected time slot', 400));
  }

  // Check driver availability
  const driverAvailable = await checkDriverAvailability(driver, depTime, arrTime);
  if (!driverAvailable) {
    return next(new ErrorResponse('Driver is not available for the selected time slot', 400));
  }

  // Create trip
  const trip = await Trip.create({
    route,
    vehicle,
    driver,
    scheduledDeparture: depTime,
    scheduledArrival: arrTime,
    fare,
    notes
  });

  // Populate references
  await trip.populate([
    { path: 'route', select: 'name code origin destination' },
    { path: 'vehicle', select: 'registrationNumber make model' },
    { path: 'driver', select: 'firstName lastName licenseNumber' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Trip created successfully',
    data: trip
  });
});

// @desc    Get all trips
// @route   GET /api/v1/trips
// @access  Private (trips:read)
exports.getAllTrips = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  if (req.query.route) {
    filter.route = req.query.route;
  }
  
  if (req.query.vehicle) {
    filter.vehicle = req.query.vehicle;
  }
  
  if (req.query.driver) {
    filter.driver = req.query.driver;
  }
  
  // Date filtering
  if (req.query.date) {
    const date = new Date(req.query.date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.scheduledDeparture = { $gte: date, $lt: nextDay };
  } else if (req.query.startDate || req.query.endDate) {
    filter.scheduledDeparture = {};
    if (req.query.startDate) {
      filter.scheduledDeparture.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setDate(endDate.getDate() + 1);
      filter.scheduledDeparture.$lt = endDate;
    }
  }

  // Sorting
  const sort = req.query.sort || '-scheduledDeparture';

  // Execute query
  const trips = await Trip.find(filter)
    .populate('route', 'name code origin destination')
    .populate('vehicle', 'registrationNumber make model')
    .populate('driver', 'firstName lastName licenseNumber')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await Trip.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: trips,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get trip by ID
// @route   GET /api/v1/trips/:id
// @access  Private (trips:read)
exports.getTripById = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id)
    .populate({
      path: 'route',
      populate: { path: 'stops' }
    })
    .populate('vehicle')
    .populate('driver');

  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }

  res.status(200).json({
    success: true,
    data: trip
  });
});

// @desc    Update trip
// @route   PUT /api/v1/trips/:id
// @access  Private (trips:update)
exports.updateTrip = asyncHandler(async (req, res, next) => {
  let trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }

  // Prevent updates to completed or cancelled trips (except notes)
  if ((trip.status === 'completed' || trip.status === 'cancelled') && Object.keys(req.body).some(key => key !== 'notes')) {
    return next(new ErrorResponse('Cannot update completed or cancelled trips except notes', 400));
  }

  // Validate status transition if status is being changed
  if (req.body.status && req.body.status !== trip.status) {
    if (!validateStatusTransition(trip.status, req.body.status)) {
      return next(new ErrorResponse(`Invalid status transition from ${trip.status} to ${req.body.status}`, 400));
    }

    // Require cancellationReason when setting status to cancelled
    if (req.body.status === 'cancelled' && !req.body.cancellationReason) {
      return next(new ErrorResponse('Cancellation reason is required', 400));
    }

    // Require delayReason when setting status to delayed
    if (req.body.status === 'delayed' && !req.body.delayReason) {
      return next(new ErrorResponse('Delay reason is required', 400));
    }
  }

  // If changing vehicle, check availability
  if (req.body.vehicle && req.body.vehicle !== trip.vehicle.toString()) {
    const vehicleDoc = await Vehicle.findById(req.body.vehicle);
    if (!vehicleDoc) {
      return next(new ErrorResponse('Vehicle not found', 404));
    }
    if (vehicleDoc.status !== 'active') {
      return next(new ErrorResponse('Vehicle is not active', 400));
    }

    const scheduledDeparture = req.body.scheduledDeparture ? new Date(req.body.scheduledDeparture) : trip.scheduledDeparture;
    const scheduledArrival = req.body.scheduledArrival ? new Date(req.body.scheduledArrival) : trip.scheduledArrival;

    const vehicleAvailable = await checkVehicleAvailability(req.body.vehicle, scheduledDeparture, scheduledArrival, trip._id);
    if (!vehicleAvailable) {
      return next(new ErrorResponse('Vehicle is not available for the selected time slot', 400));
    }
  }

  // If changing driver, check availability
  if (req.body.driver && req.body.driver !== trip.driver.toString()) {
    const driverDoc = await Driver.findById(req.body.driver);
    if (!driverDoc) {
      return next(new ErrorResponse('Driver not found', 404));
    }
    if (driverDoc.employmentStatus !== 'active') {
      return next(new ErrorResponse('Driver is not active', 400));
    }

    const scheduledDeparture = req.body.scheduledDeparture ? new Date(req.body.scheduledDeparture) : trip.scheduledDeparture;
    const scheduledArrival = req.body.scheduledArrival ? new Date(req.body.scheduledArrival) : trip.scheduledArrival;

    const driverAvailable = await checkDriverAvailability(req.body.driver, scheduledDeparture, scheduledArrival, trip._id);
    if (!driverAvailable) {
      return next(new ErrorResponse('Driver is not available for the selected time slot', 400));
    }
  }

  // If changing times, check availability for existing resources
  if (req.body.scheduledDeparture || req.body.scheduledArrival) {
    const scheduledDeparture = req.body.scheduledDeparture ? new Date(req.body.scheduledDeparture) : trip.scheduledDeparture;
    const scheduledArrival = req.body.scheduledArrival ? new Date(req.body.scheduledArrival) : trip.scheduledArrival;

    if (scheduledArrival <= scheduledDeparture) {
      return next(new ErrorResponse('Scheduled arrival must be after scheduled departure', 400));
    }

    const vehicleAvailable = await checkVehicleAvailability(trip.vehicle, scheduledDeparture, scheduledArrival, trip._id);
    if (!vehicleAvailable) {
      return next(new ErrorResponse('Vehicle is not available for the new time slot', 400));
    }

    const driverAvailable = await checkDriverAvailability(trip.driver, scheduledDeparture, scheduledArrival, trip._id);
    if (!driverAvailable) {
      return next(new ErrorResponse('Driver is not available for the new time slot', 400));
    }
  }

  // Update trip
  trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate([
    { path: 'route', select: 'name code origin destination' },
    { path: 'vehicle', select: 'registrationNumber make model' },
    { path: 'driver', select: 'firstName lastName licenseNumber' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Trip updated successfully',
    data: trip
  });
});

// @desc    Delete trip
// @route   DELETE /api/v1/trips/:id
// @access  Private (trips:delete)
exports.deleteTrip = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }

  // Only allow deletion of scheduled trips
  if (trip.status !== 'scheduled') {
    return next(new ErrorResponse('Can only delete scheduled trips', 400));
  }

  await trip.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Trip deleted successfully'
  });
});

// @desc    Start trip
// @route   POST /api/v1/trips/:id/start
// @access  Private (trips:update)
exports.startTrip = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }

  // Verify status is scheduled or delayed
  if (trip.status !== 'scheduled' && trip.status !== 'delayed') {
    return next(new ErrorResponse('Can only start scheduled or delayed trips', 400));
  }

  // Update trip
  trip.actualDeparture = new Date();
  trip.status = 'in-progress';
  await trip.save();

  await trip.populate([
    { path: 'route', select: 'name code origin destination' },
    { path: 'vehicle', select: 'registrationNumber make model' },
    { path: 'driver', select: 'firstName lastName licenseNumber' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Trip started successfully',
    data: trip
  });
});

// @desc    Complete trip
// @route   POST /api/v1/trips/:id/complete
// @access  Private (trips:update)
exports.completeTrip = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }

  // Verify status is in-progress
  if (trip.status !== 'in-progress') {
    return next(new ErrorResponse('Can only complete in-progress trips', 400));
  }

  // Validate passenger count if provided
  if (req.body.passengerCount !== undefined) {
    const vehicle = await Vehicle.findById(trip.vehicle);
    if (req.body.passengerCount > vehicle.capacity) {
      return next(new ErrorResponse('Passenger count exceeds vehicle capacity', 400));
    }
    trip.passengerCount = req.body.passengerCount;
  }

  // Update trip
  trip.actualArrival = new Date();
  trip.status = 'completed';
  if (req.body.notes) {
    trip.notes = req.body.notes;
  }
  await trip.save();

  await trip.populate([
    { path: 'route', select: 'name code origin destination' },
    { path: 'vehicle', select: 'registrationNumber make model' },
    { path: 'driver', select: 'firstName lastName licenseNumber' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Trip completed successfully',
    data: trip
  });
});

// @desc    Cancel trip
// @route   POST /api/v1/trips/:id/cancel
// @access  Private (trips:update)
exports.cancelTrip = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }

  // Verify status is not completed or cancelled
  if (trip.status === 'completed' || trip.status === 'cancelled') {
    return next(new ErrorResponse('Cannot cancel completed or already cancelled trips', 400));
  }

  // Validate cancellation reason
  if (!req.body.cancellationReason) {
    return next(new ErrorResponse('Cancellation reason is required', 400));
  }

  // Update trip
  trip.status = 'cancelled';
  trip.cancellationReason = req.body.cancellationReason;
  if (trip.status === 'in-progress') {
    trip.actualArrival = new Date();
  }
  await trip.save();

  await trip.populate([
    { path: 'route', select: 'name code origin destination' },
    { path: 'vehicle', select: 'registrationNumber make model' },
    { path: 'driver', select: 'firstName lastName licenseNumber' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Trip cancelled successfully',
    data: trip
  });
});

// @desc    Mark trip as delayed
// @route   POST /api/v1/trips/:id/delay
// @access  Private (trips:update)
exports.markTripDelayed = asyncHandler(async (req, res, next) => {
  const trip = await Trip.findById(req.params.id);

  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }

  // Verify status is scheduled
  if (trip.status !== 'scheduled') {
    return next(new ErrorResponse('Can only delay scheduled trips', 400));
  }

  // Validate delay reason and duration
  if (!req.body.delayReason) {
    return next(new ErrorResponse('Delay reason is required', 400));
  }
  if (!req.body.delayDuration || req.body.delayDuration <= 0) {
    return next(new ErrorResponse('Valid delay duration is required', 400));
  }

  // Update trip
  trip.status = 'delayed';
  trip.delayReason = req.body.delayReason;
  trip.delayDuration = req.body.delayDuration;
  await trip.save();

  await trip.populate([
    { path: 'route', select: 'name code origin destination' },
    { path: 'vehicle', select: 'registrationNumber make model' },
    { path: 'driver', select: 'firstName lastName licenseNumber' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Trip marked as delayed',
    data: trip
  });
});
