const MaintenanceRecord = require('../models/MaintenanceRecord.model');
const Vehicle = require('../models/Vehicle.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { findConflictingTrips, findConflictingMaintenance, formatDateTime } = require('../utils/schedule');

const POPULATE_VEHICLE = { path: 'vehicle', select: 'registrationNumber make model status capacity' };

/**
 * Validate a time window for a vehicle. Responds and returns true when blocked:
 * - 400 if another maintenance overlaps
 * - 409 with the conflicting trips if the vehicle is booked to run — they must be
 *   moved to another vehicle first (the planner sees exactly which ones)
 */
const rejectIfWindowTaken = async (res, next, vehicleId, start, end, excludeId) => {
  const [otherMaintenance] = await findConflictingMaintenance(vehicleId, start, end, { excludeId });
  if (otherMaintenance) {
    next(new ErrorResponse(
      `Vehicle already has maintenance from ${formatDateTime(otherMaintenance.scheduledStart)} to ${formatDateTime(otherMaintenance.scheduledEnd)}`,
      400
    ));
    return true;
  }

  const trips = await findConflictingTrips(vehicleId, start, end);
  if (trips.length > 0) {
    res.status(409).json({
      success: false,
      error: `Vehicle has ${trips.length} trip(s) in this period. Assign them to another vehicle first`,
      data: {
        conflictingTrips: trips.map(t => ({
          _id: t._id,
          route: t.route,
          scheduledDeparture: t.scheduledDeparture,
          scheduledArrival: t.scheduledArrival,
          status: t.status
        }))
      }
    });
    return true;
  }
  return false;
};

// @desc    List maintenance records
// @route   GET /api/v1/maintenance
// @access  Private (maintenance:read)
exports.getAllMaintenance = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 200);

  const filter = {};
  if (req.query.vehicle) filter.vehicle = req.query.vehicle;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = { $in: req.query.status.split(',') };

  // Upcoming/ongoing first by start date; finished ones newest first
  const finished = req.query.status && req.query.status.split(',').every(s => s === 'completed' || s === 'cancelled');
  const sort = req.query.sort || (finished ? '-scheduledStart' : 'scheduledStart');

  const [records, total] = await Promise.all([
    MaintenanceRecord.find(filter).populate(POPULATE_VEHICLE).sort(sort)
      .skip((page - 1) * limit).limit(limit),
    MaintenanceRecord.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: records.length,
    total,
    currentPage: page,
    totalPages: Math.ceil(total / limit) || 1,
    data: records
  });
});

// @desc    Get one maintenance record
// @route   GET /api/v1/maintenance/:id
// @access  Private (maintenance:read)
exports.getMaintenanceById = asyncHandler(async (req, res, next) => {
  const record = await MaintenanceRecord.findById(req.params.id).populate(POPULATE_VEHICLE);
  if (!record) return next(new ErrorResponse('Maintenance record not found', 404));
  res.status(200).json({ success: true, data: record });
});

// @desc    Schedule maintenance — blocked while the vehicle has trips in that window
// @route   POST /api/v1/maintenance
// @access  Private (maintenance:create)
exports.createMaintenance = asyncHandler(async (req, res, next) => {
  const { vehicle, type, scheduledStart, scheduledEnd, garage, cost, notes } = req.body;
  if (!vehicle || !type || !scheduledStart || !scheduledEnd) {
    return next(new ErrorResponse('Please provide vehicle, type, scheduledStart and scheduledEnd', 400));
  }

  const vehicleDoc = await Vehicle.findById(vehicle);
  if (!vehicleDoc) return next(new ErrorResponse('Vehicle not found', 404));
  if (vehicleDoc.status === 'retired') {
    return next(new ErrorResponse('Cannot schedule maintenance for a retired vehicle', 400));
  }

  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  if (end <= start) return next(new ErrorResponse('Scheduled end must be after scheduled start', 400));

  if (await rejectIfWindowTaken(res, next, vehicle, start, end)) return;

  const record = await MaintenanceRecord.create({
    vehicle, type, scheduledStart: start, scheduledEnd: end, garage, cost, notes,
    createdBy: req.user._id
  });
  await record.populate(POPULATE_VEHICLE);

  res.status(201).json({ success: true, data: record });
});

// @desc    Edit a scheduled maintenance (times, type, garage, cost, notes)
// @route   PUT /api/v1/maintenance/:id
// @access  Private (maintenance:update)
exports.updateMaintenance = asyncHandler(async (req, res, next) => {
  const record = await MaintenanceRecord.findById(req.params.id);
  if (!record) return next(new ErrorResponse('Maintenance record not found', 404));
  if (record.status !== 'scheduled') {
    return next(new ErrorResponse('Only scheduled maintenance can be edited', 400));
  }

  const start = req.body.scheduledStart ? new Date(req.body.scheduledStart) : record.scheduledStart;
  const end = req.body.scheduledEnd ? new Date(req.body.scheduledEnd) : record.scheduledEnd;
  if (end <= start) return next(new ErrorResponse('Scheduled end must be after scheduled start', 400));

  if (await rejectIfWindowTaken(res, next, record.vehicle, start, end, record._id)) return;

  ['type', 'garage', 'cost', 'notes'].forEach(f => {
    if (req.body[f] !== undefined) record[f] = req.body[f];
  });
  record.scheduledStart = start;
  record.scheduledEnd = end;
  await record.save();
  await record.populate(POPULATE_VEHICLE);

  res.status(200).json({ success: true, data: record });
});

// @desc    Start maintenance now — vehicle goes to 'maintenance'
// @route   PATCH /api/v1/maintenance/:id/start
// @access  Private (maintenance:update)
exports.startMaintenance = asyncHandler(async (req, res, next) => {
  const record = await MaintenanceRecord.findById(req.params.id);
  if (!record) return next(new ErrorResponse('Maintenance record not found', 404));
  if (record.status !== 'scheduled') {
    return next(new ErrorResponse('Only scheduled maintenance can be started', 400));
  }

  // Starting early pulls the window forward — the vehicle must be free from now on
  const now = new Date();
  const end = record.scheduledEnd > now ? record.scheduledEnd : new Date(now.getTime() + 60 * 60 * 1000);
  if (await rejectIfWindowTaken(res, next, record.vehicle, now, end, record._id)) return;

  record.status = 'in-progress';
  record.startedAt = now;
  await record.save();

  const vehicle = await Vehicle.findById(record.vehicle);
  if (vehicle && vehicle.status === 'active') {
    vehicle.status = 'maintenance';
    await vehicle.save();
  }

  await record.populate(POPULATE_VEHICLE);
  res.status(200).json({ success: true, data: record });
});

// @desc    Complete maintenance — vehicle back to 'active'; periodic resets the interval,
//          inspection requires the new inspection expiry date
// @route   PATCH /api/v1/maintenance/:id/complete
// @access  Private (maintenance:update)
exports.completeMaintenance = asyncHandler(async (req, res, next) => {
  const record = await MaintenanceRecord.findById(req.params.id);
  if (!record) return next(new ErrorResponse('Maintenance record not found', 404));
  if (record.status !== 'in-progress') {
    return next(new ErrorResponse('Only in-progress maintenance can be completed', 400));
  }

  const vehicle = await Vehicle.findById(record.vehicle);
  if (record.type === 'inspection') {
    if (!req.body.inspectionExpiry) {
      return next(new ErrorResponse('Please provide the new inspection expiry date', 400));
    }
    vehicle.inspectionExpiry = new Date(req.body.inspectionExpiry);
  }

  const now = new Date();
  record.status = 'completed';
  record.completedAt = now;
  if (req.body.cost !== undefined) record.cost = req.body.cost;
  if (req.body.notes !== undefined) record.notes = req.body.notes;
  await record.save();

  if (record.type === 'periodic') vehicle.lastMaintenanceAt = now;
  // Back in service unless another maintenance is still running
  const stillInGarage = await MaintenanceRecord.exists({ vehicle: vehicle._id, status: 'in-progress' });
  if (vehicle.status === 'maintenance' && !stillInGarage) vehicle.status = 'active';
  await vehicle.save();

  await record.populate(POPULATE_VEHICLE);
  res.status(200).json({ success: true, data: record });
});

// @desc    Cancel maintenance — if it was running, the vehicle goes back to 'active'
// @route   PATCH /api/v1/maintenance/:id/cancel
// @access  Private (maintenance:update)
exports.cancelMaintenance = asyncHandler(async (req, res, next) => {
  const record = await MaintenanceRecord.findById(req.params.id);
  if (!record) return next(new ErrorResponse('Maintenance record not found', 404));
  if (!['scheduled', 'in-progress'].includes(record.status)) {
    return next(new ErrorResponse('Only scheduled or in-progress maintenance can be cancelled', 400));
  }

  const wasRunning = record.status === 'in-progress';
  record.status = 'cancelled';
  record.cancelledAt = new Date();
  if (req.body.reason) record.cancellationReason = req.body.reason;
  await record.save();

  if (wasRunning) {
    const vehicle = await Vehicle.findById(record.vehicle);
    const stillInGarage = await MaintenanceRecord.exists({ vehicle: record.vehicle, status: 'in-progress' });
    if (vehicle && vehicle.status === 'maintenance' && !stillInGarage) {
      vehicle.status = 'active';
      await vehicle.save();
    }
  }

  await record.populate(POPULATE_VEHICLE);
  res.status(200).json({ success: true, data: record });
});

// @desc    Delete a scheduled or cancelled record
// @route   DELETE /api/v1/maintenance/:id
// @access  Private (maintenance:delete)
exports.deleteMaintenance = asyncHandler(async (req, res, next) => {
  const record = await MaintenanceRecord.findById(req.params.id);
  if (!record) return next(new ErrorResponse('Maintenance record not found', 404));
  if (!['scheduled', 'cancelled'].includes(record.status)) {
    return next(new ErrorResponse('Only scheduled or cancelled maintenance can be deleted', 400));
  }
  await record.deleteOne();
  res.status(200).json({ success: true, data: {} });
});
