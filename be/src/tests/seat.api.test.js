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
app.use(errorHandler);

describe('Seat API Tests', () => {
  let adminToken;
  let testTripId;
  let testSeatId;
  const LARGE_CAPACITY = 50;

  beforeAll(async () => {
    await connectDB();

    // Login as admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });

    if (!loginRes.body.data?.token) {
      throw new Error('Admin login failed. Run npm run seed:roles first.');
    }
    adminToken = loginRes.body.data.token;

    // Find or create a test trip with a real vehicle
    const Vehicle = require('../models/Vehicle.model');
    const Driver = require('../models/Driver.model');
    const Route = require('../models/Route.model');

    // Upsert test vehicle with required capacity
    const vehicle = await Vehicle.findOneAndUpdate(
      { registrationNumber: 'SEAT-TEST-V1' },
      { registrationNumber: 'SEAT-TEST-V1', make: 'Test', model: 'Bus', year: 2022, capacity: LARGE_CAPACITY, status: 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let driver = await Driver.findOne({ employmentStatus: 'active' });
    if (!driver) {
      driver = await Driver.findOneAndUpdate(
        { licenseNumber: 'SEAT-LIC-01' },
        { firstName: 'Seat', lastName: 'TestDriver', email: 'seat.driver@test.com', phone: '0900000099', licenseNumber: 'SEAT-LIC-01', licenseType: 'Class B', licenseExpiry: new Date('2030-01-01'), employmentStatus: 'active' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    let route = await Route.findOne({ status: 'active' });
    if (!route) {
      route = await Route.create({
        name: 'Seat Test Route', code: 'SEAT-RT-01',
        origin: 'Ha Noi', destination: 'Ho Chi Minh',
        distance: 1700, estimatedDuration: 120, status: 'active'
      });
    }

    const trip = await Trip.create({
      route: route._id,
      vehicle: vehicle._id,
      driver: driver._id,
      scheduledDeparture: new Date(Date.now() + 24 * 60 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 26 * 60 * 60 * 1000),
      status: 'scheduled',
      fare: 150000
    });
    testTripId = String(trip._id);

    // Clean existing test seats
    await Seat.deleteMany({ trip: testTripId });
  }, 30000);

  afterAll(async () => {
    await Seat.deleteMany({ trip: testTripId });
    await Booking.deleteMany({ trip: testTripId });
    await Trip.findByIdAndDelete(testTripId);
    // Do not close mongoose connection when running multiple test suites in band
    if (process.env.JEST_WORKER_ID === '1' && !global.__CLOSE_DB__) {
      // Skip closing to avoid breaking booking tests
    }
    await mongoose.connection.close();
  });

  // ─── Integration Tests ───────────────────────────────────────────────────────

  describe('[Integration] Seat Initialization', () => {
    test('[Integration] Initialize seats for a trip with valid tripId', async () => {
      const res = await request(app)
        .post('/api/v1/seats/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tripId: testTripId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(LARGE_CAPACITY);
      expect(res.body.data).toHaveLength(LARGE_CAPACITY);
      expect(res.body.data[0].seatNumber).toBe(1);
      expect(res.body.data[0].status).toBe('available');
    });

    test('[Integration] Get seat map for a trip', async () => {
      const res = await request(app)
        .get(`/api/v1/seats?tripId=${testTripId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(LARGE_CAPACITY);
      testSeatId = res.body.data[5]._id; // pick seat #6 for later tests
    });

    test('[Integration] Filter seat map by status=available', async () => {
      const res = await request(app)
        .get(`/api/v1/seats?tripId=${testTripId}&status=available`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach(seat => expect(seat.status).toBe('available'));
    });

    test('[Integration] Get seat availability (Public — no token needed)', async () => {
      const res = await request(app)
        .get(`/api/v1/seats/availability?tripId=${testTripId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSeats).toBe(LARGE_CAPACITY);
      expect(res.body.data.availableSeats).toBe(LARGE_CAPACITY);
      expect(res.body.data.seats).toHaveLength(LARGE_CAPACITY);
    });

    test('[Integration] Update seat status to unavailable', async () => {
      const firstSeatRes = await request(app)
        .get(`/api/v1/seats?tripId=${testTripId}&status=available`)
        .set('Authorization', `Bearer ${adminToken}`);

      const seatToUpdate = firstSeatRes.body.data[0]._id;

      const res = await request(app)
        .patch(`/api/v1/seats/${seatToUpdate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'unavailable' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('unavailable');

      // Restore
      await Seat.findByIdAndUpdate(seatToUpdate, { status: 'available' });
    });
  });

  // ─── Negative Tests ──────────────────────────────────────────────────────────

  describe('[Negative] Validation Tests', () => {
    test('[Negative] Reject duplicate seat initialization', async () => {
      const res = await request(app)
        .post('/api/v1/seats/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tripId: testTripId });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already initialized/i);
    });

    test('[Negative] Initialize with non-existent tripId returns 404', async () => {
      const res = await request(app)
        .post('/api/v1/seats/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tripId: '507f1f77bcf86cd799439099' });

      expect(res.status).toBe(404);
    });

    test('[Negative] GET /seats without tripId returns 400', async () => {
      const res = await request(app)
        .get('/api/v1/seats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/tripId/i);
    });

    test('[Negative] GET /availability without tripId returns 400', async () => {
      const res = await request(app)
        .get('/api/v1/seats/availability');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/tripId/i);
    });

    test('[Negative] PATCH seat with status=reserved returns 400', async () => {
      const seatRes = await request(app)
        .get(`/api/v1/seats?tripId=${testTripId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const seatId = seatRes.body.data[3]._id;

      const res = await request(app)
        .patch(`/api/v1/seats/${seatId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'reserved' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot manually set/i);
    });

    test('[Negative] PATCH non-existent seat returns 404', async () => {
      const res = await request(app)
        .patch('/api/v1/seats/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'unavailable' });

      expect(res.status).toBe(404);
    });
  });

  // ─── Security Tests ──────────────────────────────────────────────────────────

  describe('[Security] Authentication and Authorization', () => {
    test('[Security] POST /seats/initialize without token returns 401', async () => {
      const res = await request(app)
        .post('/api/v1/seats/initialize')
        .send({ tripId: testTripId });

      expect(res.status).toBe(401);
    });

    test('[Security] GET /seats without token returns 401', async () => {
      const res = await request(app)
        .get(`/api/v1/seats?tripId=${testTripId}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── Performance Tests ───────────────────────────────────────────────────────

  describe('[Performance] Large Seat Map', () => {
    test('[Performance] Get seat map for trip with 50 seats returns all seats', async () => {
      const res = await request(app)
        .get(`/api/v1/seats?tripId=${testTripId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(LARGE_CAPACITY);
    });
  });
});
