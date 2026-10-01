// One-off, idempotent migration for databases seeded before the maintenance feature.
// Adds maintenance:create/read/update/delete and grants them to admin and manager.
// Unlike `npm run seed:roles`, it does NOT wipe roles, users or permission edits made in the UI.
//
//   node scripts/migrate-maintenance-permissions.js
require('dotenv').config();
const mongoose = require('mongoose');
const Permission = require('../src/models/Permission.model');
const Role = require('../src/models/Role.model');

const PERMISSIONS = [
  { resource: 'maintenance', action: 'create', description: 'Schedule vehicle maintenance' },
  { resource: 'maintenance', action: 'read', description: 'View maintenance schedule' },
  { resource: 'maintenance', action: 'update', description: 'Edit, start, complete or cancel maintenance' },
  { resource: 'maintenance', action: 'delete', description: 'Delete maintenance records' },
];
const GRANT_TO = ['admin', 'manager'];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const ids = [];
  for (const p of PERMISSIONS) {
    const doc = await Permission.findOneAndUpdate(
      { resource: p.resource, action: p.action },
      { $setOnInsert: p },
      { upsert: true, new: true }
    );
    ids.push(doc._id);
  }
  console.log(`✓ ${ids.length} maintenance permissions present`);

  for (const name of GRANT_TO) {
    const res = await Role.updateOne({ name }, { $addToSet: { permissions: { $each: ids } } });
    console.log(`✓ ${name}: ${res.modifiedCount ? 'granted' : 'already had them'}`);
  }

  await mongoose.disconnect();
})().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
