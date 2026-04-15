const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const Trip = require('../models/Trip.model');
const Route = require('../models/Route.model');
const Vehicle = require('../models/Vehicle.model');
const Driver = require('../models/Driver.model');
const User = require('../models/User.model');
const Role = require('../models/Role.model');
const Permission = require('../models/Permission.model');
const connectDB = require('../config/database');
const errorHandler = require('../middleware/errorHandler');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/auth', require('../routes/auth.routes'));
app.use('/api/v1/trips', require('../routes/trip.routes'));
app.use(errorHandler);

describe('Trip API Tests', () => {
  let authToken;
  let testTripId;
  let testRoute, testVehicle, testDriver;
  let testVehicle2, testDriver2;

  beforeAll(async () => {
    await connectDB();
    
    // Login
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });
    
    if (!loginResponse.body.data || !loginResponse.body.data.token) {
      console.error('Login failed. Response:', JSON.stringify(loginResponse.body, null, 2));
      throw new Error('Failed to login. Please ensure admin user exists with email: admin@example.com and password: Admin@123');
    }
    
    authToken = loginResponse.body.data.token;

    // Get test resources
    testRoute = await Route.findOne({ status: 'active' });
    const vehicles = await Vehicle.find({ status: 'active' }).limit(2);
    const drivers = await Driver.find({ employmentStatus: 'active' }).limit(2);
    
    testVehicle = vehicles[0];
    testVehicle2 = vehicles[1];
    testDriver = drivers[0];
    testDriver2 = drivers[1];
  }, 30000);

  afterAll(async () => {
    await Trip.deleteMany({ 
      $or: [
        { fare: 999 },
        { notes: { $regex: /TEST/i } }
      ]
    });
    await mongoose.connection.close();
  });

  // Integration Tests - CRUD Operations
  describe('[Integration] CRUD Operations', () => {
    test('[Integration] Create trip with valid data', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const departure = new Date(tomorrow.setHours(10, 0, 0, 0));
      const arrival = new Date(tomorrow.setHours(11, 0, 0, 0));

      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle._id,
          driver: testDriver._id,
          scheduledDeparture: departure,
          scheduledArrival: arrival,
          fare: 999,
          notes: 'TEST trip'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('scheduled');
      testTripId = response.body.data._id;
    });

    test('[Integration] Get all trips with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/trips?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    test('[Integration] Get trip by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/trips/${testTripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testTripId);
    });

    test('[Integration] Update trip', async () => {
      const response = await request(app)
        .put(`/api/v1/trips/${testTripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'TEST Updated trip' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('TEST Updated trip');
    });

    test('[Integration] Delete scheduled trip', async () => {
      const response = await request(app)
        .delete(`/api/v1/trips/${testTripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Negative Tests - Validation
  describe('[Negative] Validation Tests', () => {
    test('[Negative] Create trip with unavailable vehicle', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const departure = new Date(tomorrow.setHours(14, 0, 0, 0));
      const arrival = new Date(tomorrow.setHours(15, 0, 0, 0));

      // Create first trip
      await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle._id,
          driver: testDriver._id,
          scheduledDeparture: departure,
          scheduledArrival: arrival,
          fare: 999
        });

      // Try to create overlapping trip with same vehicle
      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle._id,
          driver: testDriver2._id,
          scheduledDeparture: new Date(tomorrow.setHours(14, 30, 0, 0)),
          scheduledArrival: new Date(tomorrow.setHours(15, 30, 0, 0)),
          fare: 999
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/not available/i);
    });

    test('[Negative] Create trip with unavailable driver', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const departure = new Date(tomorrow.setHours(16, 0, 0, 0));
      const arrival = new Date(tomorrow.setHours(17, 0, 0, 0));

      // Create first trip
      await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle2._id,
          driver: testDriver2._id,
          scheduledDeparture: departure,
          scheduledArrival: arrival,
          fare: 999
        });

      // Try to create overlapping trip with same driver
      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle._id,
          driver: testDriver2._id,
          scheduledDeparture: new Date(tomorrow.setHours(16, 30, 0, 0)),
          scheduledArrival: new Date(tomorrow.setHours(17, 30, 0, 0)),
          fare: 999
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/not available/i);
    });

    test('[Negative] Create trip with past departure time', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle._id,
          driver: testDriver._id,
          scheduledDeparture: yesterday,
          scheduledArrival: new Date(),
          fare: 999
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/future/i);
    });

    test('[Negative] Create trip with invalid time range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const departure = new Date(tomorrow.setHours(10, 0, 0, 0));
      const arrival = new Date(tomorrow.setHours(9, 0, 0, 0)); // Before departure

      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle._id,
          driver: testDriver._id,
          scheduledDeparture: departure,
          scheduledArrival: arrival,
          fare: 999
        });

      expect(response.status).toBe(400);
    });

    test('[Negative] Create trip with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fare: 999 });

      expect(response.status).toBe(400);
    });
  });

  // Integration Tests - Status Management
  describe('[Integration] Status Management', () => {
    let scheduledTripId, inProgressTripId;

    beforeAll(async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create scheduled trip
      const scheduledTrip = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle._id,
          driver: testDriver._id,
          scheduledDeparture: new Date(tomorrow.setHours(8, 0, 0, 0)),
          scheduledArrival: new Date(tomorrow.setHours(9, 0, 0, 0)),
          fare: 999,
          notes: 'TEST Status trip'
        });
      scheduledTripId = scheduledTrip.body.data._id;
    });

    test('[Integration] Start scheduled trip', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${scheduledTripId}/start`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('in-progress');
      expect(response.body.data.actualDeparture).toBeDefined();
      inProgressTripId = scheduledTripId;
    });

    test('[Integration] Complete in-progress trip', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${inProgressTripId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ passengerCount: 40, notes: 'TEST Completed' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.actualArrival).toBeDefined();
      expect(response.body.data.passengerCount).toBe(40);
    });

    test('[Negative] Start completed trip', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${inProgressTripId}/start`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    test('[Integration] Mark trip as delayed', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const delayTrip = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle2._id,
          driver: testDriver2._id,
          scheduledDeparture: new Date(tomorrow.setHours(12, 0, 0, 0)),
          scheduledArrival: new Date(tomorrow.setHours(13, 0, 0, 0)),
          fare: 999
        });

      const response = await request(app)
        .post(`/api/v1/trips/${delayTrip.body.data._id}/delay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ delayReason: 'Traffic', delayDuration: 30 });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('delayed');
      expect(response.body.data.delayReason).toBe('Traffic');
    });

    test('[Integration] Cancel trip with reason', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const cancelTrip = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle._id,
          driver: testDriver._id,
          scheduledDeparture: new Date(tomorrow.setHours(18, 0, 0, 0)),
          scheduledArrival: new Date(tomorrow.setHours(19, 0, 0, 0)),
          fare: 999
        });

      const response = await request(app)
        .post(`/api/v1/trips/${cancelTrip.body.data._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cancellationReason: 'TEST Vehicle breakdown' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('cancelled');
      expect(response.body.data.cancellationReason).toBe('TEST Vehicle breakdown');
    });

    test('[Negative] Cancel without reason', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const trip = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route: testRoute._id,
          vehicle: testVehicle2._id,
          driver: testDriver2._id,
          scheduledDeparture: new Date(tomorrow.setHours(20, 0, 0, 0)),
          scheduledArrival: new Date(tomorrow.setHours(21, 0, 0, 0)),
          fare: 999
        });

      const response = await request(app)
        .post(`/api/v1/trips/${trip.body.data._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/reason/i);
    });
  });

  // Integration Tests - Filtering
  describe('[Integration] Search and Filter', () => {
    test('[Integration] Filter trips by status', async () => {
      const response = await request(app)
        .get('/api/v1/trips?status=scheduled')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(t => {
        expect(t.status).toBe('scheduled');
      });
    });

    test('[Integration] Filter trips by route', async () => {
      const response = await request(app)
        .get(`/api/v1/trips?route=${testRoute._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(t => {
        expect(t.route._id).toBe(testRoute._id.toString());
      });
    });

    test('[Integration] Filter trips by date', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/v1/trips?date=${dateStr}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('[Performance] Handle pagination with large limit', async () => {
      const response = await request(app)
        .get('/api/v1/trips?page=1&limit=100')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  // Negative Tests - Business Rules
  describe('[Negative] Business Rules', () => {
    test('[Negative] Delete in-progress trip', async () => {
      const trip = await Trip.findOne({ status: 'in-progress' });
      if (trip) {
        const response = await request(app)
          .delete(`/api/v1/trips/${trip._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
      }
    });

    test('[Negative] Update completed trip', async () => {
      const trip = await Trip.findOne({ status: 'completed' });
      if (trip) {
        const response = await request(app)
          .put(`/api/v1/trips/${trip._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ vehicle: testVehicle2._id });

        expect(response.status).toBe(400);
      }
    });
  });

  // Security Tests
  describe('[Security] Authentication and Authorization', () => {
    test('[Security] Require authentication for trip access', async () => {
      const response = await request(app)
        .get('/api/v1/trips');

      expect(response.status).toBe(401);
    });

    test('[Security] Require authentication for trip creation', async () => {
      const response = await request(app)
        .post('/api/v1/trips')
        .send({ fare: 50 });

      expect(response.status).toBe(401);
    });

    test('[Security] Require authentication for trip update', async () => {
      const response = await request(app)
        .put('/api/v1/trips/507f1f77bcf86cd799439011')
        .send({ notes: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  // Additional Tests
  describe('[Integration] Additional Scenarios', () => {
    test('[Negative] Get trip with invalid ID', async () => {
      const response = await request(app)
        .get('/api/v1/trips/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    test('[Negative] Update non-existent trip', async () => {
      const response = await request(app)
        .put('/api/v1/trips/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Test' });

      expect(response.status).toBe(404);
    });
  });
});
