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
app.use('/api/v1/users', require('../routes/user.routes'));
app.use(errorHandler);

const EMAIL = 'managed.user@test.com';
const PASSWORD = 'Managed@1';

describe('User management API (admin)', () => {
  let adminToken, adminId, staffToken;
  let userId;

  const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
  const login = (email, password) => request(app).post('/api/v1/auth/login').send({ email, password });

  beforeAll(async () => {
    await connectDB();
    await User.deleteOne({ email: EMAIL });

    const admin = await login('admin@example.com', 'Admin@123');
    adminToken = admin.body.data.token;
    adminId = admin.body.data.user._id;
    staffToken = (await login('staff@example.com', 'Staff@123')).body.data.token;
  }, 30000);

  afterAll(async () => {
    await User.deleteOne({ email: EMAIL });
    await mongoose.connection.close();
  });

  test('[Integration] Admin creates a staff account', async () => {
    const res = await asAdmin(request(app).post('/api/v1/auth/create-user'))
      .send({ name: 'Managed User', email: EMAIL, password: PASSWORD, roleName: 'staff' });

    expect(res.status).toBe(201);
    userId = res.body.data._id;
    expect((await login(EMAIL, PASSWORD)).status).toBe(200);
  });

  test('[Integration] List supports search, role and status filters', async () => {
    const bySearch = await asAdmin(request(app).get('/api/v1/users?search=managed.user'));
    expect(bySearch.status).toBe(200);
    expect(bySearch.body.data.map(u => u.email)).toEqual([EMAIL]);

    const byRole = await asAdmin(request(app).get('/api/v1/users?role=staff&limit=100'));
    expect(byRole.body.data.every(u => u.role.name === 'staff')).toBe(true);
    expect(byRole.body.data.some(u => u.email === EMAIL)).toBe(true);

    const inactive = await asAdmin(request(app).get('/api/v1/users?status=inactive&limit=100'));
    expect(inactive.body.data.some(u => u.email === EMAIL)).toBe(false);
  });

  test('[Integration] Admin changes the role', async () => {
    const managerRole = await Role.findOne({ name: 'manager' });
    const res = await asAdmin(request(app).put(`/api/v1/users/${userId}`)).send({ role: managerRole._id });

    expect(res.status).toBe(200);
    expect(res.body.data.role.name).toBe('manager');
  });

  test('[Integration] Locking an account signs it out everywhere; unlocking restores login', async () => {
    const session = (await login(EMAIL, PASSWORD)).body.data;

    const lock = await asAdmin(request(app).put(`/api/v1/users/${userId}`)).send({ isActive: false });
    expect(lock.status).toBe(200);
    expect(lock.body.data.isActive).toBe(false);

    // Existing access token, refresh token and new logins are all rejected
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${session.token}`);
    expect(me.status).toBe(401);
    const refresh = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken: session.refreshToken });
    expect(refresh.status).toBe(401);
    expect((await login(EMAIL, PASSWORD)).status).toBe(401);

    const unlock = await asAdmin(request(app).put(`/api/v1/users/${userId}`)).send({ isActive: true });
    expect(unlock.status).toBe(200);
    expect((await login(EMAIL, PASSWORD)).status).toBe(200);
  });

  test('[Negative] Admin cannot change own role, lock or delete own account', async () => {
    const staffRole = await Role.findOne({ name: 'staff' });

    const ownRole = await asAdmin(request(app).put(`/api/v1/users/${adminId}`)).send({ role: staffRole._id });
    expect(ownRole.status).toBe(400);

    const ownLock = await asAdmin(request(app).put(`/api/v1/users/${adminId}`)).send({ isActive: false });
    expect(ownLock.status).toBe(400);

    const ownDelete = await asAdmin(request(app).delete(`/api/v1/users/${adminId}`));
    expect(ownDelete.status).toBe(400);
  });

  test('[Security] Non-admin cannot list users, lock or change roles of others', async () => {
    const list = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${staffToken}`);
    expect(list.status).toBe(403);

    const update = await request(app)
      .put(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ isActive: false });
    expect(update.status).toBe(403);
  });

  test('[Integration] Admin deletes the account', async () => {
    const res = await asAdmin(request(app).delete(`/api/v1/users/${userId}`));
    expect(res.status).toBe(200);
    expect(await User.countDocuments({ email: EMAIL })).toBe(0);
  });
});
