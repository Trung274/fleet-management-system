const request = require('supertest');
const User = require('../../models/User.model');
const Role = require('../../models/Role.model');

/**
 * Create a throwaway account with the given role and log it in.
 * Role permissions can be edited from the admin UI, so tests that need
 * "a user WITHOUT permission X" should check `lacks()` instead of assuming
 * what the seeded staff account can do.
 */
async function loginAsTempUser(app, roleName, email = `temp.${roleName}.${Date.now()}@test.com`) {
  const role = await Role.findOne({ name: roleName });
  if (!role) throw new Error(`Role '${roleName}' not found — run npm run seed:roles`);

  const password = 'TempUser@1';
  await User.deleteOne({ email });
  await User.create({ name: `Temp ${roleName}`, email, password, role: role._id });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });

  return {
    token: res.body.data.token,
    lacks: (resource, action) => !role.permissions.some(p => p.resource === resource && p.action === action),
    cleanup: () => User.deleteOne({ email }),
  };
}

module.exports = { loginAsTempUser };
