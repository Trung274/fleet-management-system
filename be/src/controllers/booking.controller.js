const Booking = require('../models/Booking.model');
const Seat = require('../models/Seat.model');
const Trip = require('../models/Trip.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create a booking — atomically reserves a seat
// @route   POST /api/v1/bookings
// @access  Protected (bookings:create)
const createBooking = asyncHandler(async (req, res, next) => {
  const { tripId, seatId, passenger, fare } = req.body;

  // Validate trip exists and is schedulable
  const trip = await Trip.findById(tripId);
  if (!trip) {
    return next(new ErrorResponse('Trip not found', 404));
  }
  if (trip.status !== 'scheduled') {
    return next(new ErrorResponse('Cannot book seats on a trip that is not scheduled', 400));
  }

  // Atomically reserve the seat — only succeeds if status is 'available'
  const seat = await Seat.findOneAndUpdate(
    { _id: seatId, trip: tripId, status: 'available' },
    { $set: { status: 'reserved' } },
    { new: true }
  );

  if (!seat) {
    // Distinguish between seat-not-found, wrong-trip, and unavailable
    const seatExists = await Seat.findById(seatId);
    if (!seatExists) {
      return next(new ErrorResponse('Seat not found', 404));
    }
    if (String(seatExists.trip) !== String(tripId)) {
      return next(new ErrorResponse('Seat does not belong to the specified trip', 400));
    }
    return next(new ErrorResponse('Seat is not available for booking', 409));
  }

  // Create booking record
  let booking;
  try {
    booking = await Booking.create({
      trip: tripId,
      seat: seatId,
      passenger,
      fare: fare !== undefined ? fare : trip.fare,
      status: 'pending'
    });
  } catch (err) {
    // Rollback: release seat back to available
    await Seat.findByIdAndUpdate(seatId, { $set: { status: 'available' } });
    // Pass validation errors (400) directly; treat others as 500
    if (err.name === 'ValidationError') {
      return next(err);
    }
    return next(new ErrorResponse(`Failed to create booking: ${err.message}`, 500));
  }

  res.status(201).json({
    success: true,
    data: booking
  });
});

// @desc    Confirm a pending booking — seat becomes 'booked'
// @route   PATCH /api/v1/bookings/:id/confirm
// @access  Protected (bookings:update)
const confirmBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }
  if (booking.status !== 'pending') {
    return next(new ErrorResponse('Only pending bookings can be confirmed', 400));
  }

  booking.status = 'confirmed';
  booking.confirmedAt = new Date();
  await booking.save();

  // Upgrade seat status to booked
  await Seat.findByIdAndUpdate(booking.seat, { $set: { status: 'booked' } });

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Cancel a booking — releases seat back to 'available'
// @route   PATCH /api/v1/bookings/:id/cancel
// @access  Protected (bookings:update)
const cancelBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }
  if (booking.status === 'cancelled') {
    return next(new ErrorResponse('Booking is already cancelled', 400));
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  if (req.body.reason) {
    booking.cancellationReason = req.body.reason;
  }
  await booking.save();

  // Release seat back to available
  await Seat.findByIdAndUpdate(booking.seat, { $set: { status: 'available' } });

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Get all bookings — paginated and filtered
// @route   GET /api/v1/bookings
// @access  Protected (bookings:read)
const getAllBookings = asyncHandler(async (req, res, next) => {
  const {
    tripId,
    status,
    search,
    page = 1,
    limit = 10,
    sort = '-bookedAt'
  } = req.query;

  const filter = {};
  if (tripId) filter.trip = tripId;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { 'passenger.name': { $regex: search, $options: 'i' } },
      { 'passenger.phone': { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('trip', 'scheduledDeparture scheduledArrival status fare route')
      .populate('seat', 'seatNumber type status')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Booking.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: bookings.length,
    total,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    },
    data: bookings
  });
});

// @desc    Get single booking — fully populated
// @route   GET /api/v1/bookings/:id
// @access  Protected (bookings:read)
const getBookingById = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: 'trip',
      populate: { path: 'route', select: 'name code origin destination' }
    })
    .populate('seat', 'seatNumber type status');

  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Delete a booking (hard delete) — releases seat if not cancelled
// @route   DELETE /api/v1/bookings/:id
// @access  Protected (bookings:delete)
const deleteBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    return next(new ErrorResponse('Booking not found', 404));
  }

  // Release seat if booking was active
  if (booking.status !== 'cancelled') {
    await Seat.findByIdAndUpdate(booking.seat, { $set: { status: 'available' } });
  }

  await booking.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

module.exports = {
  createBooking,
  confirmBooking,
  cancelBooking,
  getAllBookings,
  getBookingById,
  deleteBooking
};
