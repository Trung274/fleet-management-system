const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const Itinerary = require('../models/Itinerary.model');
const Booking = require('../models/Booking.model');
const Seat = require('../models/Seat.model');
const Trip = require('../models/Trip.model');
const Route = require('../models/Route.model');
const Vehicle = require('../models/Vehicle.model');
const Driver = require('../models/Driver.model');
// Ensure all schemas are registered for Mongoose population
require('../models/Role.model');
require('../models/Permission.model');
const connectDB = require('../config/database');
const errorHandler = require('../middleware/errorHandler');

// Build test app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', require('../routes/auth.routes'));
app.use('/api/v1/bookings', require('../routes/booking.routes'));
app.use('/api/v1/itineraries', require('../routes/itinerary.routes'));
app.use(errorHandler);

const ROUTE_CODES = ['IT-TEST-AB', 'IT-TEST-BC', 'IT-TEST-XY'];

describe('Itinerary API Tests', () => {
  let adminToken;
  let tripAB, tripBC, tripBCTight, tripXY;
  const seats = {}; // seats[tripKey] = [seat1, seat2]
  let itineraryId;

  const at = (hours, minutes = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const passenger = { name: 'Itinerary Tester', phone: '0909000111' };

  beforeAll(async () => {
    await connectDB();

    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });
    if (!adminRes.body.data?.token) throw new Error('Admin login failed. Run npm run seed:roles first.');
    adminToken = adminRes.body.data.token;

    const vehicle = await Vehicle.findOneAndUpdate(
      { registrationNumber: 'IT-TEST-V1' },
      { registrationNumber: 'IT-TEST-V1', make: 'Test', model: 'Bus', year: 2022, capacity: 20, status: 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const driver = await Driver.findOne({ employmentStatus: 'active' });

    const upsertRoute = (code, origin, destination) => Route.findOneAndUpdate(
      { code },
      { name: `Itinerary Test ${origin}-${destination}`, code, origin, destination, distance: 100, estimatedDuration: 120, status: 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const routeAB = await upsertRoute('IT-TEST-AB', 'Point A', 'Point B');
    const routeBC = await upsertRoute('IT-TEST-BC', 'Point B', 'Point C');
    const routeXY = await upsertRoute('IT-TEST-XY', 'Point X', 'Point Y');

    // Trips are inserted directly — scheduling rules are tested in trip.api.test.js
    const makeTrip = (route, dep, arr, fare) => Trip.create({
      route: route._id, vehicle: vehicle._id, driver: driver._id,
      scheduledDeparture: dep, scheduledArrival: arr, status: 'scheduled', fare
    });
    tripAB = await makeTrip(routeAB, at(8), at(10), 100000);
    tripBC = await makeTrip(routeBC, at(11), at(13), 200000);        // 60 min transfer
    tripBCTight = await makeTrip(routeBC, at(10, 10), at(12), 200000); // 10 min transfer
    tripXY = await makeTrip(routeXY, at(12), at(14), 150000);        // does not connect

    for (const [key, trip] of Object.entries({ tripAB, tripBC, tripBCTight, tripXY })) {
      seats[key] = await Seat.create([1, 2].map(n => ({ trip: trip._id, vehicle: vehicle._id, seatNumber: n })));
    }
  }, 30000);

  afterAll(async () => {
    const tripIds = [tripAB, tripBC, tripBCTight, tripXY].filter(Boolean).map(t => t._id);
    await Itinerary.deleteMany({ 'passenger.phone': passenger.phone });
    await Booking.deleteMany({ trip: { $in: tripIds } });
    await Seat.deleteMany({ trip: { $in: tripIds } });
    await Trip.deleteMany({ _id: { $in: tripIds } });
    await Route.deleteMany({ code: { $in: ROUTE_CODES } });
    await Vehicle.deleteOne({ registrationNumber: 'IT-TEST-V1' });
    await mongoose.connection.close();
  });

  const post = (body) => request(app)
    .post('/api/v1/itineraries')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(body);

  describe('[Integration] Create itinerary', () => {
    test('[Integration] Create 2-leg itinerary — all seats reserved', async () => {
      const res = await post({
        passenger,
        legs: [
          { tripId: tripAB._id, seatId: seats.tripAB[0]._id },
          { tripId: tripBC._id, seatId: seats.tripBC[0]._id }
        ]
      });

      expect(res.status).toBe(201);
      expect(res.body.data.legs).toHaveLength(2);
      expect(res.body.data.totalFare).toBe(300000);
      expect(res.body.data.status).toBe('pending');
      itineraryId = res.body.data._id;

      const legSeats = await Seat.find({ _id: { $in: [seats.tripAB[0]._id, seats.tripBC[0]._id] } });
      expect(legSeats.every(s => s.status === 'reserved')).toBe(true);

      const bookings = await Booking.find({ itinerary: itineraryId });
      expect(bookings).toHaveLength(2);
    });

    test('[Integration] Get itinerary shows feasible connection', async () => {
      const res = await request(app)
        .get(`/api/v1/itineraries/${itineraryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.connections).toHaveLength(1);
      expect(res.body.data.connections[0].transferMinutes).toBe(60);
      expect(res.body.data.connections[0].ok).toBe(true);
      expect(res.body.data.atRisk).toBe(false);
    });

    test('[Integration] List itineraries', async () => {
      const res = await request(app)
        .get('/api/v1/itineraries?search=Itinerary Tester')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('[Negative] Validation', () => {
    test('[Negative] Legs that do not connect return 400', async () => {
      const res = await post({
        passenger,
        legs: [
          { tripId: tripAB._id, seatId: seats.tripAB[1]._id },
          { tripId: tripXY._id, seatId: seats.tripXY[0]._id }
        ]
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/ends at/i);
    });

    test('[Negative] Not enough transfer time returns 400', async () => {
      const res = await post({
        passenger,
        legs: [
          { tripId: tripAB._id, seatId: seats.tripAB[1]._id },
          { tripId: tripBCTight._id, seatId: seats.tripBCTight[0]._id }
        ]
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/transfer time/i);
    });

    test('[Negative] Single leg returns 400', async () => {
      const res = await post({
        passenger,
        legs: [{ tripId: tripAB._id, seatId: seats.tripAB[1]._id }]
      });

      expect(res.status).toBe(400);
    });

    test('[Negative] Unavailable seat on leg 2 rolls back leg 1', async () => {
      // seats.tripBC[0] is already reserved by the first itinerary
      const res = await post({
        passenger,
        legs: [
          { tripId: tripAB._id, seatId: seats.tripAB[1]._id },
          { tripId: tripBC._id, seatId: seats.tripBC[0]._id }
        ]
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Leg 2/);

      const leg1Seat = await Seat.findById(seats.tripAB[1]._id);
      expect(leg1Seat.status).toBe('available');
      const leg1Booking = await Booking.findOne({ seat: seats.tripAB[1]._id });
      expect(leg1Booking).toBeNull();
    });

    test('[Negative] Cancelling a single leg via /bookings returns 400', async () => {
      const booking = await Booking.findOne({ itinerary: itineraryId });
      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/itinerary/i);
    });
  });

  describe('[Integration] Delay detection', () => {
    test('[Integration] Delay on leg 1 marks itinerary at risk', async () => {
      await Trip.updateOne(
        { _id: tripAB._id },
        { status: 'delayed', delayReason: 'Traffic', delayDuration: 45 }
      );

      const res = await request(app)
        .get(`/api/v1/itineraries/${itineraryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.connections[0].transferMinutes).toBe(15);
      expect(res.body.data.connections[0].ok).toBe(false);
      expect(res.body.data.atRisk).toBe(true);

      await Trip.updateOne(
        { _id: tripAB._id },
        { status: 'scheduled', $unset: { delayReason: 1, delayDuration: 1 } }
      );
    });
  });

  describe('[Integration] Status management', () => {
    test('[Integration] Confirm itinerary — all seats booked', async () => {
      const res = await request(app)
        .patch(`/api/v1/itineraries/${itineraryId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('confirmed');

      const bookings = await Booking.find({ itinerary: itineraryId }).populate('seat');
      expect(bookings.every(b => b.status === 'confirmed')).toBe(true);
      expect(bookings.every(b => b.seat.status === 'booked')).toBe(true);
    });

    test('[Negative] Confirm already confirmed itinerary returns 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/itineraries/${itineraryId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    test('[Integration] Cancel itinerary — all seats released', async () => {
      const res = await request(app)
        .patch(`/api/v1/itineraries/${itineraryId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Passenger changed plans' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');

      const bookings = await Booking.find({ itinerary: itineraryId }).populate('seat');
      expect(bookings.every(b => b.status === 'cancelled')).toBe(true);
      expect(bookings.every(b => b.seat.status === 'available')).toBe(true);
    });

    test('[Negative] Cancel already cancelled itinerary returns 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/itineraries/${itineraryId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('[Security] Authentication', () => {
    test('[Security] POST /itineraries without auth returns 401', async () => {
      const res = await request(app).post('/api/v1/itineraries').send({});
      expect(res.status).toBe(401);
    });
  });
});
