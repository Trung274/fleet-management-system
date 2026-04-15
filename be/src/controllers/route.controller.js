const Route = require('../models/Route.model');
const RouteStop = require('../models/RouteStop.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new route
// @route   POST /api/v1/routes
// @access  Private (routes:create)
exports.createRoute = asyncHandler(async (req, res, next) => {
  const route = await Route.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Route created successfully',
    data: route
  });
});

// @desc    Get all routes
// @route   GET /api/v1/routes
// @access  Private (routes:read)
exports.getAllRoutes = asyncHandler(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const startIndex = (page - 1) * limit;

  // Build query
  const query = {};

  // Filter by status (comma-separated for multiple values)
  if (req.query.status) {
    const statuses = req.query.status.split(',').map(s => s.trim());
    query.status = { $in: statuses };
  }

  // Filter by service type (comma-separated for multiple values)
  if (req.query.serviceType) {
    const serviceTypes = req.query.serviceType.split(',').map(t => t.trim());
    query.serviceType = { $in: serviceTypes };
  }

  // Search across name, code, origin, and destination
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query.$or = [
      { name: searchRegex },
      { code: searchRegex },
      { origin: searchRegex },
      { destination: searchRegex }
    ];
  }

  // Sorting
  let sortBy = '-createdAt';
  if (req.query.sort) {
    sortBy = req.query.sort;
  }

  // Execute query
  const total = await Route.countDocuments(query);
  const routes = await Route.find(query)
    .skip(startIndex)
    .limit(limit)
    .sort(sortBy);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  res.status(200).json({
    success: true,
    data: routes,
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

// @desc    Get single route by ID
// @route   GET /api/v1/routes/:id
// @access  Private (routes:read)
exports.getRouteById = asyncHandler(async (req, res, next) => {
  const route = await Route.findById(req.params.id).populate({
    path: 'stops',
    options: { sort: { sequence: 1 } }
  });

  if (!route) {
    return next(new ErrorResponse(`Route not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: route
  });
});

// @desc    Update route
// @route   PUT /api/v1/routes/:id
// @access  Private (routes:update)
exports.updateRoute = asyncHandler(async (req, res, next) => {
  const route = await Route.findById(req.params.id);

  if (!route) {
    return next(new ErrorResponse(`Route not found with id of ${req.params.id}`, 404));
  }

  // Business rule: discontinued routes cannot change status
  if (route.status === 'discontinued' && req.body.status && req.body.status !== 'discontinued') {
    return next(new ErrorResponse('Cannot change status of discontinued route', 400));
  }

  const updatedRoute = await Route.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: 'Route updated successfully',
    data: updatedRoute
  });
});

// @desc    Delete route
// @route   DELETE /api/v1/routes/:id
// @access  Private (routes:delete)
exports.deleteRoute = asyncHandler(async (req, res, next) => {
  const route = await Route.findById(req.params.id);

  if (!route) {
    return next(new ErrorResponse(`Route not found with id of ${req.params.id}`, 404));
  }

  // Cascade delete: remove all associated route stops
  await RouteStop.deleteMany({ route: route._id });

  // Delete the route
  await route.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Route and associated stops deleted successfully'
  });
});

// @desc    Add stop to route
// @route   POST /api/v1/routes/:id/stops
// @access  Private (routes:update)
exports.addStopToRoute = asyncHandler(async (req, res, next) => {
  const route = await Route.findById(req.params.id);

  if (!route) {
    return next(new ErrorResponse(`Route not found with id of ${req.params.id}`, 404));
  }

  // Check for duplicate sequence
  const existingStop = await RouteStop.findOne({
    route: route._id,
    sequence: req.body.sequence
  });

  if (existingStop) {
    return next(new ErrorResponse('Stop sequence already exists for this route', 400));
  }

  // Create route stop
  const routeStop = await RouteStop.create({
    ...req.body,
    route: route._id
  });

  // Add stop to route's stops array
  route.stops.push(routeStop._id);
  await route.save();

  res.status(201).json({
    success: true,
    message: 'Stop added to route successfully',
    data: routeStop
  });
});

// @desc    Update route stop
// @route   PUT /api/v1/routes/:id/stops/:stopId
// @access  Private (routes:update)
exports.updateRouteStop = asyncHandler(async (req, res, next) => {
  const route = await Route.findById(req.params.id);

  if (!route) {
    return next(new ErrorResponse(`Route not found with id of ${req.params.id}`, 404));
  }

  const routeStop = await RouteStop.findById(req.params.stopId);

  if (!routeStop) {
    return next(new ErrorResponse(`Route stop not found with id of ${req.params.stopId}`, 404));
  }

  // Check if stop belongs to this route
  if (routeStop.route.toString() !== route._id.toString()) {
    return next(new ErrorResponse('Route stop not found for this route', 404));
  }

  // If updating sequence, check for duplicates
  if (req.body.sequence && req.body.sequence !== routeStop.sequence) {
    const existingStop = await RouteStop.findOne({
      route: route._id,
      sequence: req.body.sequence
    });

    if (existingStop) {
      return next(new ErrorResponse('Stop sequence already exists for this route', 400));
    }
  }

  const updatedStop = await RouteStop.findByIdAndUpdate(
    req.params.stopId,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: 'Route stop updated successfully',
    data: updatedStop
  });
});

// @desc    Remove stop from route
// @route   DELETE /api/v1/routes/:id/stops/:stopId
// @access  Private (routes:update)
exports.removeStopFromRoute = asyncHandler(async (req, res, next) => {
  const route = await Route.findById(req.params.id);

  if (!route) {
    return next(new ErrorResponse(`Route not found with id of ${req.params.id}`, 404));
  }

  const routeStop = await RouteStop.findById(req.params.stopId);

  if (!routeStop) {
    return next(new ErrorResponse(`Route stop not found with id of ${req.params.stopId}`, 404));
  }

  // Check if stop belongs to this route
  if (routeStop.route.toString() !== route._id.toString()) {
    return next(new ErrorResponse('Route stop not found for this route', 404));
  }

  // Remove stop from route's stops array
  route.stops = route.stops.filter(stopId => stopId.toString() !== req.params.stopId);
  await route.save();

  // Delete the route stop
  await routeStop.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Stop removed from route successfully'
  });
});
