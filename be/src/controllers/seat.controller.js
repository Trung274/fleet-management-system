const Seat = require('../models/Seat.model');
const Trip = require('../models/Trip.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Initialize seats for a trip based on vehicle capacity
// @route   POST /api/v1/seats/initialize
// @access  Protected (seats:update)
const initializeSeats = asyncHandler(async (req, res, next) => {
  const { tripId } = req.body;

  if (!tripId) {
    return next(new ErrorResponse('tripId is required', 400));
  }

  // Find trip and populate vehicle for capacity
  const trip = await Trip.findById(tripId).populate('vehicle');
  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }

  // Guard: check if seats already initialized
  const existingCount = await Seat.countDocuments({ trip: tripId });
  if (existingCount > 0) {
    return next(new ErrorResponse('Seats already initialized for this trip', 400));
  }

  const capacity = trip.vehicle.capacity;
  const seats = [];
  for (let i = 1; i <= capacity; i++) {
    seats.push({
      trip: tripId,
      vehicle: trip.vehicle._id,
      seatNumber: i,
      type: 'standard',
      status: 'available'
    });
  }

  const createdSeats = await Seat.insertMany(seats);

  res.status(201).json({
    success: true,
    count: createdSeats.length,
    data: createdSeats
  });
});

// @desc    Get seat map for a trip
// @route   GET /api/v1/seats
// @access  Protected (seats:read)
const getSeatMap = asyncHandler(async (req, res, next) => {
  const { tripId, status } = req.query;

  if (!tripId) {
    return next(new ErrorResponse('tripId query parameter is required', 400));
  }

  const filter = { trip: tripId };
  if (status) {
    filter.status = status;
  }

  const seats = await Seat.find(filter).sort({ seatNumber: 1 });

  res.status(200).json({
    success: true,
    count: seats.length,
    data: seats
  });
});

// @desc    Check seat availability summary for a trip (Public)
// @route   GET /api/v1/seats/availability
// @access  Public
const getSeatAvailability = asyncHandler(async (req, res, next) => {
  const { tripId } = req.query;

  if (!tripId) {
    return next(new ErrorResponse('tripId query parameter is required', 400));
  }

  // Verify trip exists
  const trip = await Trip.findById(tripId);
  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }

  const seats = await Seat.find({ trip: tripId }).sort({ seatNumber: 1 });

  const summary = {
    tripId,
    totalSeats: seats.length,
    availableSeats: seats.filter(s => s.status === 'available').length,
    reservedSeats: seats.filter(s => s.status === 'reserved').length,
    bookedSeats: seats.filter(s => s.status === 'booked').length,
    unavailableSeats: seats.filter(s => s.status === 'unavailable').length,
    seats: seats.map(s => ({
      _id: s._id,
      seatNumber: s.seatNumber,
      type: s.type,
      status: s.status
    }))
  };

  res.status(200).json({
    success: true,
    data: summary
  });
});

// @desc    Manually update a seat status (e.g. mark unavailable for maintenance)
// @route   PATCH /api/v1/seats/:id
// @access  Protected (seats:update)
const updateSeat = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  // Prevent manually setting reserved/booked — use the booking API
  if (status === 'reserved' || status === 'booked') {
    return next(new ErrorResponse('Cannot manually set reserved or booked status; use the booking API', 400));
  }

  const seat = await Seat.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!seat) {
    return next(new ErrorResponse('Seat not found', 404));
  }

  res.status(200).json({
    success: true,
    data: seat
  });
});

module.exports = {
  initializeSeats,
  getSeatMap,
  getSeatAvailability,
  updateSeat
};
