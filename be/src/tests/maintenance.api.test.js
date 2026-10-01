const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const MaintenanceRecord = require('../models/MaintenanceRecord.model');
const Vehicle = require('../models/Vehicle.model');
const Trip = require('../models/Trip.model');
const Seat = require('../models/Seat.model');
const Route = require('../models/Route.model');
const Driver = require('../models/Driver.model');
// Ensure all schemas are registered for Mongoose population
require('../models/Role.model');
require('../models/Permission.model');
require('../models/RouteStop.model');
const connectDB = require('../config/database');
const errorHandler = require('../middleware/errorHandler');
const { loginAsTempUser } = require('./helpers/tempUser');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', require('../routes/auth.routes'));
app.use('/api/v1/trips', require('../routes/trip.routes'));
app.use('/api/v1/maintenance', require('../routes/maintenance.routes'));
app.use('/api/v1/notifications', require('../routes/notification.routes'));
app.use(errorHandler);

const REG = 'MT-TEST-V1';

describe('Maintenance API', () => {
  let token, vehicle, route, driver;
  let periodicId, tripId;

  // Far from seeded trips; 'day N at H:00' local time
  const at = (days, hours) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hours, 0, 0, 0);
    return d;
  };
  const dateOnly = days => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + days));
  };
  const api = (method, url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
  const createTrip = (dep, arr) => api('post', '/api/v1/trips').send({
    route: route._id, vehicle: vehicle._id, driver: driver._id,
    scheduledDeparture: dep, scheduledArrival: arr, fare: 999
  });

  beforeAll(async () => {
    await connectDB();
    await cleanup();
    vehicle = await Vehicle.create({
      registrationNumber: REG, make: 'Test', model: 'Bus', year: 2022, capacity: 16, status: 'active'
    });
    route = await Route.findOne({ status: 'active' });
    driver = await Driver.findOne({ employmentStatus: 'active', licenseExpiry: { $gt: at(120, 0) } });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@example.com', password: 'Admin@123' });
    token = login.body.data.token;
  }, 30000);

  async function cleanup() {
    const v = await Vehicle.findOne({ registrationNumber: REG });
    if (!v) return;
    const trips = await Trip.find({ vehicle: v._id }).select('_id');
    await Seat.deleteMany({ trip: { $in: trips.map(t => t._id) } });
    await Trip.deleteMany({ vehicle: v._id });
    await MaintenanceRecord.deleteMany({ vehicle: v._id });
    await v.deleteOne();
  }

  afterAll(async () => {
    await cleanup();
    await mongoose.connection.close();
  });

  test('[Integration] Schedule maintenance', async () => {
    const res = await api('post', '/api/v1/maintenance').send({
      vehicle: vehicle._id, type: 'periodic', scheduledStart: at(40, 8), scheduledEnd: at(40, 17), garage: 'Test Garage'
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('scheduled');
    periodicId = res.body.data._id;
  });

  test('[Negative] Overlapping maintenance on the same vehicle returns 400', async () => {
    const res = await api('post', '/api/v1/maintenance').send({
      vehicle: vehicle._id, type: 'repair', scheduledStart: at(40, 12), scheduledEnd: at(41, 12)
    });
    expect(res.status).toBe(400);
  });

  test('[Negative] A trip during maintenance is rejected', async () => {
    const res = await createTrip(at(40, 10), at(40, 11));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maintenance scheduled/i);
  });

  test('[Negative] Maintenance over an existing trip returns 409 with the conflicting trips', async () => {
    const trip = await createTrip(at(42, 10), at(42, 11));
    expect(trip.status).toBe(201);
    tripId = trip.body.data._id;

    const res = await api('post', '/api/v1/maintenance').send({
      vehicle: vehicle._id, type: 'repair', scheduledStart: at(42, 8), scheduledEnd: at(42, 17)
    });
    expect(res.status).toBe(409);
    expect(res.body.data.conflictingTrips.map(t => t._id)).toEqual([tripId]);
  });

  test('[Negative] A trip ending after the inspection expiry is rejected', async () => {
    await Vehicle.updateOne({ _id: vehicle._id }, { inspectionExpiry: dateOnly(44) });

    const ok = await createTrip(at(44, 8), at(44, 9));       // ends on the expiry day
    expect(ok.status).toBe(201);
    const late = await createTrip(at(44, 22), at(45, 1));    // runs past midnight
    expect(late.status).toBe(400);
    expect(late.body.error).toMatch(/inspection expires/i);

    await Vehicle.updateOne({ _id: vehicle._id }, { $unset: { inspectionExpiry: 1 } });
  });

  test('[Integration] Start puts the vehicle in maintenance; complete restores it', async () => {
    const start = await api('patch', `/api/v1/maintenance/${periodicId}/start`);
    expect(start.status).toBe(200);
    expect((await Vehicle.findById(vehicle._id)).status).toBe('maintenance');

    const done = await api('patch', `/api/v1/maintenance/${periodicId}/complete`).send({ cost: 1200000 });
    expect(done.status).toBe(200);
    const v = await Vehicle.findById(vehicle._id);
    expect(v.status).toBe('active');
    expect(v.lastMaintenanceAt).toBeDefined();
  });

  test('[Integration] Completing an inspection requires and stores the new expiry date', async () => {
    const created = await api('post', '/api/v1/maintenance').send({
      vehicle: vehicle._id, type: 'inspection', scheduledStart: at(1, 8), scheduledEnd: at(1, 12)
    });
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    await api('patch', `/api/v1/maintenance/${id}/start`);

    expect((await api('patch', `/api/v1/maintenance/${id}/complete`)).status).toBe(400);

    const done = await api('patch', `/api/v1/maintenance/${id}/complete`).send({ inspectionExpiry: '2028-12-31' });
    expect(done.status).toBe(200);
    expect((await Vehicle.findById(vehicle._id)).inspectionExpiry.toISOString().slice(0, 10)).toBe('2028-12-31');
  });

  test('[Integration] Cancel and delete a scheduled record', async () => {
    const created = await api('post', '/api/v1/maintenance').send({
      vehicle: vehicle._id, type: 'repair', scheduledStart: at(50, 8), scheduledEnd: at(50, 17)
    });
    const id = created.body.data._id;
    expect((await api('patch', `/api/v1/maintenance/${id}/cancel`).send({ reason: 'test' })).status).toBe(200);
    expect((await api('delete', `/api/v1/maintenance/${id}`)).status).toBe(200);
  });

  test('[Integration] Notifications include vehicle alerts only for users who can read vehicles', async () => {
    await Vehicle.updateOne({ _id: vehicle._id }, { inspectionExpiry: dateOnly(10) });

    const admin = await api('get', '/api/v1/notifications');
    expect(admin.status).toBe(200);
    const inspection = admin.body.data.find(n => n.id.startsWith(`inspection:${vehicle._id}`));
    expect(inspection).toBeDefined();
    expect(inspection.severity).toBe('warning');
    // The trips already booked after that date are flagged too
    expect(admin.body.data.some(n => n.id === `trip-inspection:${tripId}`)).toBe(true);

    const temp = await loginAsTempUser(app, 'user');
    try {
      expect(temp.lacks('vehicles', 'read')).toBe(true);
      const res = await request(app).get('/api/v1/notifications').set('Authorization', 'Bearer ' + temp.token);
      expect(res.status).toBe(200);
      expect(res.body.data.some(n => n.message.includes(REG))).toBe(false);
    } finally {
      await temp.cleanup();
    }
  });

  test('[Security] Maintenance needs the maintenance permission', async () => {
    const temp = await loginAsTempUser(app, 'user');
    try {
      const res = await request(app).get('/api/v1/maintenance').set('Authorization', 'Bearer ' + temp.token);
      expect(res.status).toBe(403);
    } finally {
      await temp.cleanup();
    }
  });
});
