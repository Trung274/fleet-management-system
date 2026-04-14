const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const Driver = require('../models/Driver.model');
const connectDB = require('../config/database');
const errorHandler = require('../middleware/errorHandler');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/auth', require('../routes/auth.routes'));
app.use('/api/v1/drivers', require('../routes/driver.routes'));
app.use(errorHandler);

describe('Driver API Tests', () => {
  let authToken;
  let testDriverId;

  beforeAll(async () => {
    await connectDB();
    await Driver.deleteMany({ licenseNumber: { $regex: /^TEST-/i } });
    
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });
    
    if (!loginResponse.body.data || !loginResponse.body.data.token) {
      throw new Error('Failed to login. Please ensure admin user exists with email: admin@example.com and password: Admin@123');
    }
    
    authToken = loginResponse.body.data.token;
  }, 30000);

  afterAll(async () => {
    await Driver.deleteMany({ licenseNumber: { $regex: /^TEST-/i } });
    await mongoose.connection.close();
  });

  // Integration Tests - CRUD Operations
  describe('[Integration] CRUD Operations', () => {
    test('[Integration] Create driver with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Driver',
          email: 'test.driver@example.com',
          phone: '+1234567890',
          licenseNumber: 'TEST-DL001',
          licenseType: 'Class B',
          licenseExpiry: '2027-12-31'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseNumber).toBe('TEST-DL001');
      testDriverId = response.body.data._id;
    });

    test('[Integration] Get all drivers with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/drivers?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    test('[Integration] Get driver by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/drivers/${testDriverId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testDriverId);
    });

    test('[Integration] Update driver', async () => {
      const response = await request(app)
        .put(`/api/v1/drivers/${testDriverId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: '+9876543210', notes: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe('+9876543210');
    });

    test('[Integration] Delete driver', async () => {
      const response = await request(app)
        .delete(`/api/v1/drivers/${testDriverId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Negative Tests - Validation
  describe('[Negative] Validation Tests', () => {
    test('[Negative] Reject duplicate licenseNumber', async () => {
      await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.dup@example.com',
          phone: '+1111111111',
          licenseNumber: 'TEST-DUP-LIC',
          licenseType: 'Class A',
          licenseExpiry: '2027-12-31'
        });

      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.dup@example.com',
          phone: '+2222222222',
          licenseNumber: 'TEST-DUP-LIC',
          licenseType: 'Class B',
          licenseExpiry: '2027-12-31'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('[Negative] Reject duplicate email', async () => {
      await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Alice',
          lastName: 'Brown',
          email: 'duplicate.email@example.com',
          phone: '+3333333333',
          licenseNumber: 'TEST-LIC-001',
          licenseType: 'Class C',
          licenseExpiry: '2027-12-31'
        });

      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Bob',
          lastName: 'White',
          email: 'duplicate.email@example.com',
          phone: '+4444444444',
          licenseNumber: 'TEST-LIC-002',
          licenseType: 'Class A',
          licenseExpiry: '2027-12-31'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('[Negative] Reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Incomplete' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('[Negative] Reject past license expiry date', async () => {
      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Expired',
          lastName: 'License',
          email: 'expired@example.com',
          phone: '+5555555555',
          licenseNumber: 'TEST-EXPIRED',
          licenseType: 'Class B',
          licenseExpiry: '2020-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // Integration Tests - Search and Filter
  describe('[Integration] Search and Filter', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'SearchTest',
          lastName: 'ActiveDriver',
          email: 'search.active@example.com',
          phone: '+6666666666',
          licenseNumber: 'TEST-SEARCH-001',
          licenseType: 'Class A',
          licenseExpiry: '2027-12-31',
          employmentStatus: 'active'
        });
    });

    test('[Integration] Filter drivers by employment status', async () => {
      const response = await request(app)
        .get('/api/v1/drivers?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(d => {
        expect(d.employmentStatus).toBe('active');
      });
    });

    test('[Integration] Filter drivers by license type', async () => {
      const response = await request(app)
        .get('/api/v1/drivers?licenseType=Class%20A')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(d => {
        expect(d.licenseType).toBe('Class A');
      });
    });

    test('[Integration] Search drivers by name', async () => {
      const response = await request(app)
        .get('/api/v1/drivers?search=SearchTest')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const found = response.body.data.some(d => d.firstName === 'SearchTest');
      expect(found).toBe(true);
    });

    test('[Performance] Handle pagination with large limit', async () => {
      const response = await request(app)
        .get('/api/v1/drivers?page=1&limit=100')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  // Negative Tests - Business Rules
  describe('[Negative] Business Rules', () => {
    let terminatedDriverId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Terminated',
          lastName: 'Driver',
          email: 'terminated.driver@example.com',
          phone: '+7777777777',
          licenseNumber: 'TEST-TERMINATED',
          licenseType: 'Class B',
          licenseExpiry: '2027-12-31',
          employmentStatus: 'terminated'
        });
      terminatedDriverId = response.body.data._id;
    });

    test('[Negative] Prevent status change on terminated driver', async () => {
      const response = await request(app)
        .put(`/api/v1/drivers/${terminatedDriverId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ employmentStatus: 'active' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/terminated/i);
    });

    test('[Integration] Verify terminationDate set automatically', async () => {
      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'AutoTerminate',
          lastName: 'Test',
          email: 'auto.terminate@example.com',
          phone: '+8888888888',
          licenseNumber: 'TEST-AUTO-TERM',
          licenseType: 'Class C',
          licenseExpiry: '2027-12-31',
          employmentStatus: 'terminated'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.terminationDate).toBeDefined();
    });
  });

  // Security Tests
  describe('[Security] Authentication and Authorization', () => {
    test('[Security] Require authentication for driver access', async () => {
      const response = await request(app)
        .get('/api/v1/drivers');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('[Security] Require authentication for driver creation', async () => {
      const response = await request(app)
        .post('/api/v1/drivers')
        .send({
          firstName: 'NoAuth',
          lastName: 'Test',
          email: 'noauth@example.com',
          phone: '+9999999999',
          licenseNumber: 'TEST-NOAUTH',
          licenseType: 'Class A',
          licenseExpiry: '2027-12-31'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('[Security] Require authentication for driver update', async () => {
      const response = await request(app)
        .put('/api/v1/drivers/507f1f77bcf86cd799439011')
        .send({ phone: '+0000000000' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // Additional Tests
  describe('[Integration] Additional Scenarios', () => {
    test('[Negative] Get driver with invalid ID', async () => {
      const response = await request(app)
        .get('/api/v1/drivers/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
