const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

const User = require('../models/User.model');
const Role = require('../models/Role.model');
// Ensure all schemas are registered for Mongoose population (login populates role.permissions)
require('../models/Permission.model');
const connectDB = require('../config/database');
const errorHandler = require('../middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', require('../routes/auth.routes'));
app.use(errorHandler);

const EMAIL = 'pw.change@test.com';
const OLD_PASSWORD = 'OldPass@1';
const NEW_PASSWORD = 'NewPass@2';

const login = (password) => request(app)
  .post('/api/v1/auth/login')
  .send({ email: EMAIL, password });

describe('Auth API — change password', () => {
  let token, refreshToken;

  beforeAll(async () => {
    await connectDB();
    await User.deleteOne({ email: EMAIL });
    const staffRole = await Role.findOne({ name: 'staff' });
    await User.create({ name: 'Password Tester', email: EMAIL, password: OLD_PASSWORD, role: staffRole._id });

    const res = await login(OLD_PASSWORD);
    token = res.body.data.token;
    refreshToken = res.body.data.refreshToken;
    // JWT iat has 1-second precision; make sure the change happens in a later second
    await new Promise(r => setTimeout(r, 1100));
  }, 30000);

  afterAll(async () => {
    await User.deleteOne({ email: EMAIL });
    await mongoose.connection.close();
  });

  const changePassword = (body, bearer = token) => request(app)
    .put('/api/v1/auth/change-password')
    .set('Authorization', `Bearer ${bearer}`)
    .send(body);

  test('[Negative] Wrong current password returns 400 (not 401)', async () => {
    const res = await changePassword({ currentPassword: 'wrong-password', newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/current password is incorrect/i);
  });

  test('[Negative] New password shorter than 6 characters returns 400', async () => {
    const res = await changePassword({ currentPassword: OLD_PASSWORD, newPassword: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 6 characters/i);
  });

  test('[Negative] Same password returns 400', async () => {
    const res = await changePassword({ currentPassword: OLD_PASSWORD, newPassword: OLD_PASSWORD });
    expect(res.status).toBe(400);
  });

  test('[Integration] Change password returns new tokens and signs out other sessions', async () => {
    const res = await changePassword({ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();

    // Old access token is rejected, new one works
    const oldMe = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(oldMe.status).toBe(401);
    const newMe = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.data.token}`);
    expect(newMe.status).toBe(200);

    // Old refresh token (another device) can no longer get a new access token
    const refresh = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken });
    expect(refresh.status).toBe(401);

    // Login works with the new password only
    expect((await login(OLD_PASSWORD)).status).toBe(401);
    expect((await login(NEW_PASSWORD)).status).toBe(200);
  });

  test('[Security] Change password without token returns 401', async () => {
    const res = await request(app).put('/api/v1/auth/change-password').send({});
    expect(res.status).toBe(401);
  });
});
