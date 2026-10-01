const mongoose = require('mongoose');
const Itinerary = require('../models/Itinerary.model');
const Booking = require('../models/Booking.model');
const Seat = require('../models/Seat.model');
const Trip = require('../models/Trip.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Minimum time (minutes) a passenger needs to change from one trip to the next
const MIN_TRANSFER_MINUTES = parseInt(process.env.MIN_TRANSFER_MINUTES) || 30;

const MINUTE_MS = 60 * 1000;

// Expected arrival/departure taking delays and actual times into account
const expectedArrival = (trip) => {
  if (trip.actualArrival) return trip.actualArrival;
  const delay = trip.status === 'delayed' ? (trip.delayDuration || 0) : 0;
  return new Date(trip.scheduledArrival.getTime() + delay * MINUTE_MS);
};

const expectedDeparture = (trip) => {
  if (trip.actualDeparture) return trip.actualDeparture;
  const delay = trip.status === 'delayed' ? (trip.delayDuration || 0) : 0;
  return new Date(trip.scheduledDeparture.getTime() + delay * MINUTE_MS);
};

const sameLocation = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Describe the connection between two consecutive trips (route must be populated)
const describeConnection = (fromTrip, toTrip) => {
  const transferMinutes = Math.round(
    (expectedDeparture(toTrip) - expectedArrival(fromTrip)) / MINUTE_MS
  );
  const locationMatches = sameLocation(fromTrip.route.destination, toTrip.route.origin);
  const tripsActive = fromTrip.status !== 'cancelled' && toTrip.status !== 'cancelled';

  return {
    transferAt: fromTrip.route.destination,
    transferMinutes,
    ok: locationMatches && tripsActive && transferMinutes >= MIN_TRANSFER_MINUTES
  };
};

// @desc    Create a multi-trip itinerary — reserves one seat per leg in a single transaction
// @route   POST /api/v1/itineraries
// @access  Protected (bookings:create)
const createItinerary = asyncHandler(async (req, res, next) => {
  const { passenger, legs } = req.body;

  if (!passenger) {
    return next(new ErrorResponse('Passenger information is required', 400));
  }
  if (!Array.isArray(legs) || legs.length < 2) {
    return next(new ErrorResponse('An itinerary needs at least 2 legs; use /bookings for a single trip', 400));
  }

  // Load and validate every trip before touching any seat
  const trips = [];
  for (const [i, leg] of legs.entries()) {
    if (!leg.tripId || !leg.seatId) {
      return next(new ErrorResponse(`Leg ${i + 1}: tripId and seatId are required`, 400));
    }
    const trip = await Trip.findById(leg.tripId).populate('route', 'origin destination');
    if (!trip) {
      return next(new ErrorResponse(`Leg ${i + 1}: trip not found`, 404));
    }
    if (trip.status !== 'scheduled') {
      return next(new ErrorResponse(`Leg ${i + 1}: cannot book a trip that is not scheduled`, 400));
    }
    trips.push(trip);
  }

  // Each leg must start where the previous one ends, with enough time to transfer
  for (let i = 0; i < trips.length - 1; i++) {
    const prevTrip = trips[i];
    const nextTrip = trips[i + 1];
    if (!sameLocation(prevTrip.route.destination, nextTrip.route.origin)) {
      return next(new ErrorResponse(
        `Leg ${i + 1} ends at ${prevTrip.route.destination} but leg ${i + 2} starts at ${nextTrip.route.origin}`, 400
      ));
    }
    const gapMinutes = (nextTrip.scheduledDeparture - prevTrip.scheduledArrival) / MINUTE_MS;
    if (gapMinutes < MIN_TRANSFER_MINUTES) {
      return next(new ErrorResponse(
        `Not enough transfer time between leg ${i + 1} and leg ${i + 2} (requires ${MIN_TRANSFER_MINUTES} minutes)`, 400
      ));
    }
  }

  // Reserve all seats and create all records atomically — any failure rolls everything back
  let itinerary;
  await mongoose.connection.transaction(async (session) => {
    const itineraryId = new mongoose.Types.ObjectId();
    const bookingIds = [];
    let totalFare = 0;

    for (const [i, leg] of legs.entries()) {
      const seat = await Seat.findOneAndUpdate(
        { _id: leg.seatId, trip: leg.tripId, status: 'available' },
        { $set: { status: 'reserved' } },
        { new: true, session }
      );

      if (!seat) {
        const seatExists = await Seat.findById(leg.seatId).session(session);
        if (!seatExists) {
          throw new ErrorResponse(`Leg ${i + 1}: seat not found`, 404);
        }
        if (String(seatExists.trip) !== String(leg.tripId)) {
          throw new ErrorResponse(`Leg ${i + 1}: seat does not belong to the specified trip`, 400);
        }
        throw new ErrorResponse(`Leg ${i + 1}: seat is not available for booking`, 409);
      }

      const fare = leg.fare !== undefined ? leg.fare : trips[i].fare;
      const [booking] = await Booking.create([{
        trip: leg.tripId,
        seat: leg.seatId,
        itinerary: itineraryId,
        passenger,
        fare,
        status: 'pending'
      }], { session });

      bookingIds.push(booking._id);
      totalFare += fare || 0;
    }

    [itinerary] = await Itinerary.create([{
      _id: itineraryId,
      passenger,
      legs: bookingIds,
      totalFare
    }], { session });
  });

  res.status(201).json({
    success: true,
    data: itinerary
  });
});

// @desc    Confirm a pending itinerary — every leg's seat becomes 'booked'
// @route   PATCH /api/v1/itineraries/:id/confirm
// @access  Protected (bookings:update)
const confirmItinerary = asyncHandler(async (req, res, next) => {
  const existing = await Itinerary.findById(req.params.id);
  if (!existing) {
    return next(new ErrorResponse('Itinerary not found', 404));
  }

  let itinerary;
  await mongoose.connection.transaction(async (session) => {
    const now = new Date();

    // Guarded status change so two concurrent requests cannot both succeed
    itinerary = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'confirmed', confirmedAt: now } },
      { new: true, session }
    );
    if (!itinerary) {
      throw new ErrorResponse('Only pending itineraries can be confirmed', 400);
    }

    const bookings = await Booking.find({ _id: { $in: itinerary.legs } }).session(session);
    await Booking.updateMany(
      { _id: { $in: itinerary.legs } },
      { $set: { status: 'confirmed', confirmedAt: now } },
      { session }
    );
    await Seat.updateMany(
      { _id: { $in: bookings.map(b => b.seat) } },
      { $set: { status: 'booked' } },
      { session }
    );
  });

  res.status(200).json({
    success: true,
    data: itinerary
  });
});

// @desc    Cancel an itinerary — every leg is cancelled and its seat released
// @route   PATCH /api/v1/itineraries/:id/cancel
// @access  Protected (bookings:update)
const cancelItinerary = asyncHandler(async (req, res, next) => {
  const existing = await Itinerary.findById(req.params.id);
  if (!existing) {
    return next(new ErrorResponse('Itinerary not found', 404));
  }

  let itinerary;
  await mongoose.connection.transaction(async (session) => {
    const now = new Date();
    const update = { status: 'cancelled', cancelledAt: now };
    if (req.body.reason) {
      update.cancellationReason = req.body.reason;
    }

    itinerary = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'cancelled' } },
      { $set: update },
      { new: true, session }
    );
    if (!itinerary) {
      throw new ErrorResponse('Itinerary is already cancelled', 400);
    }

    const activeBookings = await Booking.find({
      _id: { $in: itinerary.legs },
      status: { $ne: 'cancelled' }
    }).session(session);

    await Booking.updateMany(
      { _id: { $in: activeBookings.map(b => b._id) } },
      { $set: update },
      { session }
    );
    await Seat.updateMany(
      { _id: { $in: activeBookings.map(b => b.seat) } },
      { $set: { status: 'available' } },
      { session }
    );
  });

  res.status(200).json({
    success: true,
    data: itinerary
  });
});

// @desc    Get all itineraries — paginated and filtered
// @route   GET /api/v1/itineraries
// @access  Protected (bookings:read)
const getAllItineraries = asyncHandler(async (req, res, next) => {
  const { status, search, page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const filter = {};
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

  const [itineraries, total] = await Promise.all([
    Itinerary.find(filter)
      .populate({
        path: 'legs',
        select: 'trip seat status fare',
        populate: [
          {
            path: 'trip',
            select: 'scheduledDeparture scheduledArrival status route',
            populate: { path: 'route', select: 'code origin destination' }
          },
          { path: 'seat', select: 'seatNumber' }
        ]
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Itinerary.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    count: itineraries.length,
    total,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    },
    data: itineraries
  });
});

// @desc    Get single itinerary with every leg populated and connection status
// @route   GET /api/v1/itineraries/:id
// @access  Protected (bookings:read)
const getItineraryById = asyncHandler(async (req, res, next) => {
  const itinerary = await Itinerary.findById(req.params.id)
    .populate({
      path: 'legs',
      populate: [
        {
          path: 'trip',
          populate: [
            { path: 'route', select: 'name code origin destination' },
            { path: 'vehicle', select: 'registrationNumber make model' },
            { path: 'driver', select: 'firstName lastName phone' }
          ]
        },
        { path: 'seat', select: 'seatNumber type status' }
      ]
    });

  if (!itinerary) {
    return next(new ErrorResponse('Itinerary not found', 404));
  }

  // Re-check every transfer against current trip times (delays, cancellations)
  const connections = [];
  for (let i = 0; i < itinerary.legs.length - 1; i++) {
    connections.push({
      fromLeg: i + 1,
      toLeg: i + 2,
      ...describeConnection(itinerary.legs[i].trip, itinerary.legs[i + 1].trip)
    });
  }

  res.status(200).json({
    success: true,
    data: {
      ...itinerary.toObject(),
      connections,
      atRisk: itinerary.status !== 'cancelled' && connections.some(c => !c.ok)
    }
  });
});

module.exports = {
  createItinerary,
  confirmItinerary,
  cancelItinerary,
  getAllItineraries,
  getItineraryById,
  // Shared with the notifications feed (itineraries at risk of a missed connection)
  describeConnection
};
