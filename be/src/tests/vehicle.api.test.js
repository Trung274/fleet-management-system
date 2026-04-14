const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const Vehicle = require('../models/Vehicle.model');
const connectDB = require('../config/database');
const errorHandler = require('../middleware/errorHandler');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/auth', require('../routes/auth.routes'));
app.use('/api/v1/vehicles', require('../routes/vehicle.routes'));
app.use(errorHandler);

describe('Vehicle API Tests', () => {
  let authToken;
  let testVehicleId;

  beforeAll(async () => {
    await connectDB();
    await Vehicle.deleteMany({ registrationNumber: { $regex: /^TEST-/i } });
    
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });
    
    if (!loginResponse.body.data || !loginResponse.body.data.token) {
      throw new Error('Failed to login. Please ensure admin user exists with email: admin@example.com and password: Admin@123');
    }
    
    authToken = loginResponse.body.data.token;
  }, 30000);

  afterAll(async () => {
    await Vehicle.deleteMany({ registrationNumber: { $regex: /^TEST-/i } });
    await mongoose.connection.close();
  });

  // Integration Tests - CRUD Operations
  describe('[Integration] CRUD Operations', () => {
    test('[Integration] Create vehicle with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registrationNumber: 'TEST-001',
          make: 'Toyota',
          model: 'Coaster',
          year: 2023,
          capacity: 30
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.registrationNumber).toBe('TEST-001');
      testVehicleId = response.body.data._id;
    });

    test('[Integration] Get all vehicles with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    test('[Integration] Get vehicle by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testVehicleId);
    });

    test('[Integration] Update vehicle', async () => {
      const response = await request(app)
        .put(`/api/v1/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ capacity: 35, notes: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.capacity).toBe(35);
    });

    test('[Integration] Delete vehicle', async () => {
      const response = await request(app)
        .delete(`/api/v1/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Negative Tests - Validation
  describe('[Negative] Validation Tests', () => {
    test('[Negative] Reject duplicate registrationNumber', async () => {
      await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registrationNumber: 'TEST-DUP',
          make: 'Honda',
          model: 'Civic',
          year: 2023,
          capacity: 5
        });

      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registrationNumber: 'TEST-DUP',
          make: 'Ford',
          model: 'Focus',
          year: 2023,
          capacity: 5
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('[Negative] Reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ registrationNumber: 'TEST-INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('[Negative] Reject invalid year value', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registrationNumber: 'TEST-YEAR',
          make: 'Test',
          model: 'Test',
          year: 1800,
          capacity: 30
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // Integration Tests - Search and Filter
  describe('[Integration] Search and Filter', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registrationNumber: 'TEST-SEARCH-001',
          make: 'Mercedes',
          model: 'Sprinter',
          year: 2023,
          capacity: 20,
          status: 'active'
        });
    });

    test('[Integration] Search vehicles by make', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles?search=Mercedes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const found = response.body.data.some(v => v.make === 'Mercedes');
      expect(found).toBe(true);
    });

    test('[Integration] Filter vehicles by status', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(v => {
        expect(v.status).toBe('active');
      });
    });

    test('[Performance] Handle pagination with large limit', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles?page=1&limit=100')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  // Negative Tests - Business Rules
  describe('[Negative] Business Rules', () => {
    let retiredVehicleId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          registrationNumber: 'TEST-RETIRED',
          make: 'Old',
          model: 'Bus',
          year: 2010,
          capacity: 25,
          status: 'retired'
        });
      retiredVehicleId = response.body.data._id;
    });

    test('[Negative] Prevent status change on retired vehicle', async () => {
      const response = await request(app)
        .put(`/api/v1/vehicles/${retiredVehicleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'active' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/retired/i);
    });
  });

  // Security Tests
  describe('[Security] Authentication and Authorization', () => {
    test('[Security] Require authentication for vehicle access', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('[Security] Require authentication for vehicle creation', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .send({
          registrationNumber: 'TEST-NOAUTH',
          make: 'Toyota',
          model: 'Coaster',
          year: 2023,
          capacity: 30
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('[Security] Require authentication for vehicle update', async () => {
      const response = await request(app)
        .put('/api/v1/vehicles/507f1f77bcf86cd799439011')
        .send({ capacity: 40 });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
