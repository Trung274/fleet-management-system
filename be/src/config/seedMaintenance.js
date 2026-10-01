require('dotenv').config();
const mongoose = require('mongoose');
const MaintenanceRecord = require('../models/MaintenanceRecord.model');
const Vehicle = require('../models/Vehicle.model');
require('../models/Route.model');
const { findConflictingTrips } = require('../utils/schedule');

// Runs after seedTrips: windows are picked on days where these vehicles have no trips,
// and are double-checked below so the seed never breaks the "no trips during maintenance" rule.

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const DAY = 24 * 60 * 60 * 1000;

const seedMaintenance = async () => {
  try {
    console.log('🌱 Starting maintenance seed...');
    await MaintenanceRecord.deleteMany({});
    console.log('✓ Cleared old maintenance records');

    const byReg = Object.fromEntries((await Vehicle.find()).map(v => [v.registrationNumber, v]));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const at = (days, hours) => new Date(today.getTime() + days * DAY + hours * 60 * 60 * 1000);

    const records = [
      // In the garage right now (vehicle status is 'maintenance' in seedVehicles)
      {
        vehicle: '15B-456.78', type: 'periodic', status: 'in-progress',
        scheduledStart: at(-2, 8), scheduledEnd: at(1, 17), startedAt: at(-2, 8),
        garage: 'Gara Thành Công - Long Biên', cost: 4500000,
        notes: 'Thay dầu, lọc gió, kiểm tra phanh'
      },
      // Coming up in 2 days → "lịch bảo dưỡng sắp tới" alert
      {
        vehicle: '29B-555.55', type: 'periodic', status: 'scheduled',
        scheduledStart: at(2, 8), scheduledEnd: at(2, 17),
        garage: 'Ford Thăng Long', cost: 3200000, notes: 'Bảo dưỡng định kỳ 10.000 km'
      },
      // Inspection booked before the current one expires
      {
        vehicle: '30F-987.65', type: 'inspection', status: 'scheduled',
        scheduledStart: at(12, 8), scheduledEnd: at(12, 12),
        garage: 'Trung tâm đăng kiểm 29-07D', notes: 'Đăng kiểm định kỳ'
      },
      // History
      {
        vehicle: '29B-123.45', type: 'repair', status: 'completed',
        scheduledStart: at(-40, 8), scheduledEnd: at(-39, 12), startedAt: at(-40, 8), completedAt: at(-39, 11),
        garage: 'Gara Thành Công - Long Biên', cost: 7800000, notes: 'Thay má phanh, láng đĩa'
      },
      {
        vehicle: '29B-123.45', type: 'periodic', status: 'cancelled',
        scheduledStart: at(-20, 8), scheduledEnd: at(-20, 17), cancelledAt: at(-21, 15),
        cancellationReason: 'Xe phải chạy tăng cường dịp lễ'
      }
    ];

    const docs = [];
    for (const r of records) {
      const vehicle = byReg[r.vehicle];
      if (!vehicle) {
        console.log(`⚠️  Vehicle ${r.vehicle} not found — skipped`);
        continue;
      }
      if (['scheduled', 'in-progress'].includes(r.status)) {
        const conflicts = await findConflictingTrips(vehicle._id, r.scheduledStart, r.scheduledEnd);
        if (conflicts.length) {
          console.log(`⚠️  ${r.vehicle} has ${conflicts.length} trip(s) in its maintenance window — skipped`);
          continue;
        }
      }
      docs.push({ ...r, vehicle: vehicle._id });
    }

    const created = await MaintenanceRecord.insertMany(docs);
    console.log(`✓ Created ${created.length} maintenance records`);
    console.log('\n🎉 Maintenance seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Maintenance seed error:', error);
    process.exit(1);
  }
};

seedMaintenance();
