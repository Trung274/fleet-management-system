const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const Route = require('../models/Route.model');
const RouteStop = require('../models/RouteStop.model');
const connectDB = require('../config/database');
const errorHandler = require('../middleware/errorHandler');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/auth', require('../routes/auth.routes'));
app.use('/api/v1/routes', require('../routes/route.routes'));
app.use(errorHandler);

describe('Route API Tests', () => {
  let authToken;
  let testRouteId;
  let testStopId;

  beforeAll(async () => {
    await connectDB();
    await RouteStop.deleteMany({ stopCode: { $regex: /^TEST-/i } });
    await Route.deleteMany({ code: { $regex: /^TEST-/i } });
    
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });
    
    if (!loginResponse.body.data || !loginResponse.body.data.token) {
      throw new Error('Failed to login. Please ensure admin user exists with email: admin@example.com and password: Admin@123');
    }
    
    authToken = loginResponse.body.data.token;
  }, 30000);

  afterAll(async () => {
    await RouteStop.deleteMany({ stopCode: { $regex: /^TEST-/i } });
    await Route.deleteMany({ code: { $regex: /^TEST-/i } });
    await mongoose.connection.close();
  });

  // Integration Tests - CRUD Operations
  describe('[Integration] CRUD Operations', () => {
    test('[Integration] Create route with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Route',
          code: 'TEST-RT-001',
          description: 'Test route for API testing',
          origin: 'Test Origin',
          destination: 'Test Destination',
          distance: 15.5,
          status: 'active',
          serviceType: 'express',
          estimatedDuration: 30
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('TEST-RT-001');
      testRouteId = response.body.data._id;
    });

    test('[Integration] Get all routes with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/routes?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    test('[Integration] Get route by ID with populated stops', async () => {
      const response = await request(app)
        .get(`/api/v1/routes/${testRouteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testRouteId);
      expect(response.body.data.stops).toBeDefined();
    });

    test('[Integration] Update route', async () => {
      const response = await request(app)
        .put(`/api/v1/routes/${testRouteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated description', estimatedDuration: 35 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.estimatedDuration).toBe(35);
    });
  });

  // Integration Tests - Route Stop Management
  describe('[Integration] Route Stop Management', () => {
    test('[Integration] Add stop to route', async () => {
      const response = await request(app)
        .post(`/api/v1/routes/${testRouteId}/stops`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stopName: 'Test Stop 1',
          stopCode: 'TEST-STOP-001',
          address: '123 Test Street',
          sequence: 1,
          distanceFromStart: 0,
          estimatedArrivalTime: 480,  // 08:00 in minutes from midnight
          estimatedDepartureTime: 480,
          coordinates: { latitude: 40.7128, longitude: -74.0060 }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stopCode).toBe('TEST-STOP-001');
      testStopId = response.body.data._id;
    });

    test('[Integration] Add another stop to route', async () => {
      const response = await request(app)
        .post(`/api/v1/routes/${testRouteId}/stops`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stopName: 'Test Stop 2',
          stopCode: 'TEST-STOP-002',
          address: '456 Test Avenue',
          sequence: 2,
          distanceFromStart: 5.5,
          estimatedArrivalTime: 495,  // 08:15
          estimatedDepartureTime: 497,  // 08:17
          coordinates: { latitude: 40.7200, longitude: -74.0100 }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('[Integration] Update route stop', async () => {
      const response = await request(app)
        .put(`/api/v1/routes/${testRouteId}/stops/${testStopId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estimatedArrivalTime: 485, estimatedDepartureTime: 485 });  // 08:05

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.estimatedArrivalTime).toBe(485);
    });

    test('[Integration] Remove stop from route', async () => {
      const response = await request(app)
        .delete(`/api/v1/routes/${testRouteId}/stops/${testStopId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // Negative Tests - Validation
  describe('[Negative] Validation Tests', () => {
    test('[Negative] Reject duplicate route code', async () => {
      await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Duplicate Test',
          code: 'TEST-DUP-CODE',
          origin: 'Origin A',
          destination: 'Destination A',
          distance: 10,
          status: 'active',
          serviceType: 'local',
          estimatedDuration: 20
        });

      const response = await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Another Route',
          code: 'TEST-DUP-CODE',
          origin: 'Origin B',
          destination: 'Destination B',
          distance: 15,
          status: 'active',
          serviceType: 'express',
          estimatedDuration: 25
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('[Negative] Reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Incomplete Route' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('[Negative] Reject negative distance', async () => {
      const response = await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Distance',
          code: 'TEST-NEG-DIST',
          origin: 'Origin',
          destination: 'Destination',
          distance: -5,
          status: 'active',
          serviceType: 'local',
          estimatedDuration: 20
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('[Negative] Reject duplicate stop sequence', async () => {
      const testRoute = await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sequence Test Route',
          code: 'TEST-SEQ-RT',
          origin: 'Start',
          destination: 'End',
          distance: 20,
          status: 'active',
          serviceType: 'local',
          estimatedDuration: 40
        });

      const routeId = testRoute.body.data._id;

      await request(app)
        .post(`/api/v1/routes/${routeId}/stops`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stopName: 'Stop A',
          stopCode: 'TEST-STOP-A',
          address: '100 A Street',
          sequence: 1,
          distanceFromStart: 0,
          estimatedArrivalTime: 540,  // 09:00
          estimatedDepartureTime: 540,
          coordinates: { latitude: 40.7, longitude: -74.0 }
        });

      const response = await request(app)
        .post(`/api/v1/routes/${routeId}/stops`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stopName: 'Stop B',
          stopCode: 'TEST-STOP-B',
          address: '200 B Street',
          sequence: 1,
          distanceFromStart: 5,
          estimatedArrivalTime: 555,  // 09:15
          estimatedDepartureTime: 555,
          coordinates: { latitude: 40.71, longitude: -74.01 }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // Integration Tests - Search and Filter
  describe('[Integration] Search and Filter', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'SearchTest Express Route',
          code: 'TEST-SEARCH-001',
          origin: 'SearchOrigin',
          destination: 'SearchDestination',
          distance: 25,
          status: 'active',
          serviceType: 'express',
          estimatedDuration: 45
        });
    });

    test('[Integration] Filter routes by status', async () => {
      const response = await request(app)
        .get('/api/v1/routes?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(r => {
        expect(r.status).toBe('active');
      });
    });

    test('[Integration] Filter routes by service type', async () => {
      const response = await request(app)
        .get('/api/v1/routes?serviceType=express')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(r => {
        expect(r.serviceType).toBe('express');
      });
    });

    test('[Integration] Search routes by name', async () => {
      const response = await request(app)
        .get('/api/v1/routes?search=SearchTest')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const found = response.body.data.some(r => r.name.includes('SearchTest'));
      expect(found).toBe(true);
    });

    test('[Integration] Search routes by origin', async () => {
      const response = await request(app)
        .get('/api/v1/routes?search=SearchOrigin')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const found = response.body.data.some(r => r.origin === 'SearchOrigin');
      expect(found).toBe(true);
    });

    test('[Performance] Handle pagination with large limit', async () => {
      const response = await request(app)
        .get('/api/v1/routes?page=1&limit=100')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  // Negative Tests - Business Rules
  describe('[Negative] Business Rules', () => {
    let discontinuedRouteId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Discontinued Route',
          code: 'TEST-DISC-RT',
          origin: 'Old Origin',
          destination: 'Old Destination',
          distance: 30,
          status: 'discontinued',
          serviceType: 'local',
          estimatedDuration: 60
        });
      discontinuedRouteId = response.body.data._id;
    });

    test('[Negative] Prevent status change on discontinued route', async () => {
      const response = await request(app)
        .put(`/api/v1/routes/${discontinuedRouteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'active' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/discontinued/i);
    });

    test('[Integration] Verify discontinuedDate set automatically', async () => {
      const response = await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Auto Discontinued',
          code: 'TEST-AUTO-DISC',
          origin: 'Start Point',
          destination: 'End Point',
          distance: 20,
          status: 'discontinued',
          serviceType: 'shuttle',
          estimatedDuration: 35
        });

      expect(response.status).toBe(201);
      expect(response.body.data.discontinuedDate).toBeDefined();
    });
  });

  // Integration Tests - Cascade Delete
  describe('[Integration] Cascade Delete', () => {
    test('[Integration] Delete route cascades to stops', async () => {
      const routeResponse = await request(app)
        .post('/api/v1/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Cascade Test Route',
          code: 'TEST-CASCADE-RT',
          origin: 'Point A',
          destination: 'Point B',
          distance: 15,
          status: 'active',
          serviceType: 'local',
          estimatedDuration: 30
        });

      const cascadeRouteId = routeResponse.body.data._id;

      const stopResponse = await request(app)
        .post(`/api/v1/routes/${cascadeRouteId}/stops`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stopName: 'Cascade Stop',
          stopCode: 'TEST-CASCADE-STOP',
          address: '999 Cascade Ave',
          sequence: 1,
          distanceFromStart: 0,
          estimatedArrivalTime: 600,  // 10:00
          estimatedDepartureTime: 600,
          coordinates: { latitude: 40.75, longitude: -74.05 }
        });

      const cascadeStopId = stopResponse.body.data._id;

      const deleteResponse = await request(app)
        .delete(`/api/v1/routes/${cascadeRouteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      const stopCheck = await RouteStop.findById(cascadeStopId);
      expect(stopCheck).toBeNull();
    });
  });

  // Security Tests
  describe('[Security] Authentication and Authorization', () => {
    test('[Security] Require authentication for route access', async () => {
      const response = await request(app)
        .get('/api/v1/routes');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('[Security] Require authentication for route creation', async () => {
      const response = await request(app)
        .post('/api/v1/routes')
        .send({
          name: 'NoAuth Route',
          code: 'TEST-NOAUTH',
          origin: 'A',
          destination: 'B',
          distance: 10,
          status: 'active',
          serviceType: 'local',
          estimatedDuration: 20
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('[Security] Require authentication for route update', async () => {
      const response = await request(app)
        .put('/api/v1/routes/507f1f77bcf86cd799439011')
        .send({ description: 'Unauthorized update' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('[Security] Require authentication for stop management', async () => {
      const response = await request(app)
        .post('/api/v1/routes/507f1f77bcf86cd799439011/stops')
        .send({
          stopName: 'Unauthorized Stop',
          stopCode: 'UNAUTH',
          sequence: 1
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // Additional Tests
  describe('[Integration] Additional Scenarios', () => {
    test('[Negative] Get route with invalid ID', async () => {
      const response = await request(app)
        .get('/api/v1/routes/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('[Negative] Update non-existent route', async () => {
      const response = await request(app)
        .put('/api/v1/routes/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Update non-existent' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('[Integration] Delete route', async () => {
      const response = await request(app)
        .delete(`/api/v1/routes/${testRouteId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
