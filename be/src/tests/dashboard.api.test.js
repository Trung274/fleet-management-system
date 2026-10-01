const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

// Ensure all schemas are registered for Mongoose population (login populates role.permissions)
require('../models/Role.model');
require('../models/Permission.model');
const connectDB = require('../config/database');
const errorHandler = require('../middleware/errorHandler');
const { loginAsTempUser } = require('./helpers/tempUser');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', require('../routes/auth.routes'));
app.use('/api/v1/dashboard', require('../routes/dashboard.routes'));
app.use(errorHandler);

describe('Dashboard API', () => {
  beforeAll(async () => {
    await connectDB();
  }, 30000);

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('[Integration] Admin gets every section', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@example.com', password: 'Admin@123' });
    const res = await request(app).get('/api/v1/dashboard').set('Authorization', `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(Object.keys(d)).toEqual(expect.arrayContaining(['trips', 'seats', 'revenue', 'vehicles', 'drivers']));
    expect(d.revenue.last7Days).toHaveLength(7);
    expect(d.trips.today.total).toBe(d.trips.schedule.length);
    // Schedule is in departure order
    const times = d.trips.schedule.map(t => new Date(t.scheduledDeparture).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  test('[Security] Sections are left out for users who cannot read them', async () => {
    const temp = await loginAsTempUser(app, 'user');
    try {
      expect(temp.lacks('bookings', 'read')).toBe(true);
      expect(temp.lacks('vehicles', 'read')).toBe(true);
      const res = await request(app).get('/api/v1/dashboard').set('Authorization', 'Bearer ' + temp.token);
      expect(res.status).toBe(200);
      ['revenue', 'vehicles', 'drivers'].forEach(section => expect(res.body.data[section]).toBeUndefined());
    } finally {
      await temp.cleanup();
    }
  });

  test('[Security] Requires authentication', async () => {
    expect((await request(app).get('/api/v1/dashboard')).status).toBe(401);
  });
});
