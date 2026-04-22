const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const Seat = require('../models/Seat.model');
const Booking = require('../models/Booking.model');
const Trip = require('../models/Trip.model');
// Ensure all schemas are registered for Mongoose population
require('../models/Role.model');
require('../models/Permission.model');
const connectDB = require('../config/database');
const errorHandler = require('../middleware/errorHandler');

// Build test app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', require('../routes/auth.routes'));
app.use('/api/v1/seats', require('../routes/seat.routes'));
app.use('/api/v1/bookings', require('../routes/booking.routes'));
app.use(errorHandler);

describe('Booking API Tests', () => {
  let adminToken;
  let staffToken;
  let testTripId;
  let cancelledTripId;
  let availableSeatId;
  let otherTripSeatId;
  let testBookingId;
  let confirmBookingId;
  let confirmSeatId; // track which seat was used for the confirm lifecycle

  beforeAll(async () => {
    await connectDB();

    // Login as admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });
    if (!adminRes.body.data?.token) throw new Error('Admin login failed. Run npm run seed:roles first.');
    adminToken = adminRes.body.data.token;

    // Login as staff
    const staffRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@example.com', password: 'Staff@123' });
    if (!staffRes.body.data?.token) throw new Error('Staff login failed. Run npm run seed:roles first.');
    staffToken = staffRes.body.data.token;

    // Create test resources
    const Vehicle = require('../models/Vehicle.model');
    const Driver = require('../models/Driver.model');
    const Route = require('../models/Route.model');

    // Upsert test vehicle to avoid duplicate key errors across runs
    const vehicle = await Vehicle.findOneAndUpdate(
      { registrationNumber: 'BK-TEST-V1' },
      { registrationNumber: 'BK-TEST-V1', make: 'Test', model: 'Bus', year: 2022, capacity: 20, status: 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let driver = await Driver.findOne({ employmentStatus: 'active' });
    if (!driver) {
      driver = await Driver.create({
        firstName: 'Booking', lastName: 'TestDriver',
        email: 'booking.driver@test.com', phone: '0900000088',
        licenseNumber: 'BK-LIC-01', licenseType: 'Class B',
        licenseExpiry: new Date('2030-01-01'),
        employmentStatus: 'active'
      });
    }

    let route = await Route.findOne({ status: 'active' });
    if (!route) {
      route = await Route.create({
        name: 'Booking Test Route', code: 'BK-RT-01',
        origin: 'Ha Noi', destination: 'Da Nang',
        distance: 800, estimatedDuration: 90, status: 'active'
      });
    }

    // Trip 1: scheduled (main test trip)
    const trip = await Trip.create({
      route: route._id, vehicle: vehicle._id, driver: driver._id,
      scheduledDeparture: new Date(Date.now() + 24 * 60 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 26 * 60 * 60 * 1000),
      status: 'scheduled', fare: 200000
    });
    testTripId = String(trip._id);

    // Trip 2: cancelled (for negative test) — use findByIdAndUpdate to bypass pre-save hook
    const cancelledTripRaw = await Trip.create({
      route: route._id, vehicle: vehicle._id, driver: driver._id,
      scheduledDeparture: new Date(Date.now() + 48 * 60 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 50 * 60 * 60 * 1000),
      status: 'scheduled', fare: 200000
    });
    await Trip.findByIdAndUpdate(cancelledTripRaw._id, {
      status: 'cancelled',
      cancellationReason: 'Test trip — cancelled for negative tests'
    });
    cancelledTripId = String(cancelledTripRaw._id);

    // Initialize seats for both trips
    await Seat.deleteMany({ trip: { $in: [testTripId, cancelledTripId] } });
    const seats = [];
    for (let i = 1; i <= 20; i++) {
      seats.push({ trip: testTripId, vehicle: vehicle._id, seatNumber: i, status: 'available' });
    }
    for (let i = 1; i <= 5; i++) {
      seats.push({ trip: cancelledTripId, vehicle: vehicle._id, seatNumber: i, status: 'available' });
    }
    const created = await Seat.insertMany(seats);
    availableSeatId = String(created.find(s => String(s.trip) === testTripId && s.seatNumber === 1)._id);
    otherTripSeatId = String(created.find(s => String(s.trip) === cancelledTripId)._id);

    // Clean existing bookings for test trips
    await Booking.deleteMany({ trip: { $in: [testTripId, cancelledTripId] } });
  }, 30000);

  afterAll(async () => {
    await Booking.deleteMany({ trip: { $in: [testTripId, cancelledTripId] } });
    await Seat.deleteMany({ trip: { $in: [testTripId, cancelledTripId] } });
    await Trip.findByIdAndDelete(testTripId);
    await Trip.findByIdAndDelete(cancelledTripId);
    await mongoose.connection.close();
  });

  // ─── Integration Tests ────────────────────────────────────────────────────────

  describe('[Integration] Booking Lifecycle', () => {
    test('[Integration] Create booking with valid data — seat becomes reserved', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: testTripId,
          seatId: availableSeatId,
          passenger: { name: 'Nguyen Van A', phone: '0901111111', email: 'vana@test.com' },
          fare: 200000
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.passenger.name).toBe('Nguyen Van A');
      testBookingId = res.body.data._id;

      // Verify seat is now reserved
      const seat = await Seat.findById(availableSeatId);
      expect(seat.status).toBe('reserved');
    });

    test('[Integration] Create a second booking for confirm/lifecycle tests', async () => {
      // Find any available seat (not seatNumber 1 which was reserved in test 1)
      const seat2 = await Seat.findOne({ trip: testTripId, seatNumber: { $gte: 2 }, status: 'available' });
      expect(seat2).not.toBeNull();
      confirmSeatId = String(seat2._id);
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: testTripId,
          seatId: confirmSeatId,
          passenger: { name: 'Tran Thi B', phone: '0902222222' }
        });

      expect(res.status).toBe(201);
      confirmBookingId = res.body.data._id;
    });

    test('[Integration] Confirm a pending booking — seat becomes booked', async () => {
      if (!confirmBookingId) {
        const freshSeat = await Seat.findOne({ trip: testTripId, status: 'available' });
        confirmSeatId = String(freshSeat._id);
        const createRes = await request(app).post('/api/v1/bookings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ tripId: testTripId, seatId: confirmSeatId, passenger: { name: 'Fallback B', phone: '0900000001' } });
        confirmBookingId = createRes.body.data?._id;
      }
      const res = await request(app)
        .patch(`/api/v1/bookings/${confirmBookingId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('confirmed');
      expect(res.body.data.confirmedAt).toBeDefined();

      // Verify the correct seat is now booked
      const seat = await Seat.findById(confirmSeatId);
      expect(seat.status).toBe('booked');
    });

    test('[Integration] Cancel a pending booking — seat released to available', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${testBookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test cancellation' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
      expect(res.body.data.cancellationReason).toBe('Test cancellation');

      const seat = await Seat.findById(availableSeatId);
      expect(seat.status).toBe('available');
    });

    test('[Integration] Get all bookings with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/bookings?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    test('[Integration] Filter bookings by tripId', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings?tripId=${testTripId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach(b => expect(String(b.trip._id || b.trip)).toBe(testTripId));
    });

    test('[Integration] Filter bookings by status=confirmed', async () => {
      const res = await request(app)
        .get('/api/v1/bookings?status=confirmed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach(b => expect(b.status).toBe('confirmed'));
    });

    test('[Integration] Get single booking with populated trip and seat', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${confirmBookingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.seat).toBeDefined();
      // Name is either 'Tran Thi B' (normal) or 'Fallback B' (defensive path)
      expect(res.body.data.passenger.name).toMatch(/Tran Thi B|Fallback B/);
    });

    test('[Integration] Delete booking — seat released to available', async () => {
      const res = await request(app)
        .delete(`/api/v1/bookings/${confirmBookingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify the correct seat is released (using confirmSeatId)
      const seat = await Seat.findById(confirmSeatId);
      expect(seat.status).toBe('available');
    });
  });

  // ─── Negative Tests ───────────────────────────────────────────────────────────

  describe('[Negative] Validation and Business Rules', () => {
    test('[Negative] Book an already-reserved seat returns 409', async () => {
      // First re-book the available seat
      await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: testTripId, seatId: availableSeatId,
          passenger: { name: 'First Booker', phone: '0909999991' }
        });

      // Try to book same seat again
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: testTripId, seatId: availableSeatId,
          passenger: { name: 'Second Booker', phone: '0909999992' }
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/not available/i);

      // Cleanup
      const b = await Booking.findOne({ 'passenger.name': 'First Booker' });
      if (b) {
        await Seat.findByIdAndUpdate(availableSeatId, { status: 'available' });
        await b.deleteOne();
      }
    });

    test('[Negative] Seat from different trip returns 400', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: testTripId, seatId: otherTripSeatId,
          passenger: { name: 'Wrong Trip', phone: '0901234500' }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/does not belong/i);
    });

    test('[Negative] Book on a cancelled trip returns 400', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: cancelledTripId, seatId: otherTripSeatId,
          passenger: { name: 'Cancelled Trip', phone: '0901234501' }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not scheduled/i);
    });

    test('[Negative] Missing passenger.name returns 400', async () => {
      const seat3 = await Seat.findOne({ trip: testTripId, status: 'available' });
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: testTripId, seatId: String(seat3._id),
          passenger: { phone: '0901234502' }
        });

      expect(res.status).toBe(400);
    });

    test('[Negative] Confirm already confirmed booking returns 400', async () => {
      // Create and confirm a fresh booking
      const seat4 = await Seat.findOne({ trip: testTripId, status: 'available' });
      const createRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tripId: testTripId, seatId: String(seat4._id),
          passenger: { name: 'Confirm Twice', phone: '0901000001' }
        });
      const bId = createRes.body.data._id;
      await request(app).patch(`/api/v1/bookings/${bId}/confirm`).set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .patch(`/api/v1/bookings/${bId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/only pending/i);

      // Cleanup
      await Booking.findByIdAndDelete(bId);
      await Seat.findByIdAndUpdate(seat4._id, { status: 'available' });
    });

    test('[Negative] Cancel already cancelled booking returns 400', async () => {
      const existingCancelled = await Booking.findOne({ status: 'cancelled', trip: testTripId });
      if (!existingCancelled) return;

      const res = await request(app)
        .patch(`/api/v1/bookings/${existingCancelled._id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already cancelled/i);
    });

    test('[Negative] GET non-existent booking returns 404', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Security Tests ────────────────────────────────────────────────────────────

  describe('[Security] Authentication and Authorization', () => {
    test('[Security] POST /bookings without auth returns 401', async () => {
      const res = await request(app).post('/api/v1/bookings').send({
        tripId: testTripId, seatId: availableSeatId,
        passenger: { name: 'No Auth', phone: '0900000000' }
      });
      expect(res.status).toBe(401);
    });

    test('[Security] GET /bookings without auth returns 401', async () => {
      const res = await request(app).get('/api/v1/bookings');
      expect(res.status).toBe(401);
    });

    test('[Security] Staff CAN create a booking', async () => {
      const seat5 = await Seat.findOne({ trip: testTripId, status: 'available' });
      if (!seat5) return;

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          tripId: testTripId, seatId: String(seat5._id),
          passenger: { name: 'Staff Booked', phone: '0908888888' }
        });

      expect(res.status).toBe(201);
      // Cleanup
      if (res.body.data?._id) {
        await Booking.findByIdAndDelete(res.body.data._id);
        await Seat.findByIdAndUpdate(seat5._id, { status: 'available' });
      }
    });

    test('[Security] Staff CANNOT initialize seats — returns 403', async () => {
      const res = await request(app)
        .post('/api/v1/seats/initialize')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ tripId: testTripId });

      expect(res.status).toBe(403);
    });

    test('[Security] Staff CANNOT delete booking — returns 403', async () => {
      const anyBooking = await Booking.findOne({ trip: testTripId });
      if (!anyBooking) return;

      const res = await request(app)
        .delete(`/api/v1/bookings/${anyBooking._id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── Performance Tests ────────────────────────────────────────────────────────

  describe('[Performance] Pagination', () => {
    test('[Performance] GET /bookings page=1&limit=10 returns correct pagination', async () => {
      const res = await request(app)
        .get('/api/v1/bookings?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.count).toBeLessThanOrEqual(10);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
    });
  });
});
