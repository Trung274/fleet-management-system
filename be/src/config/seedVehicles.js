require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle.model');

// Connect to database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedVehicles = async () => {
  try {
    console.log('🌱 Starting vehicle seed process...');

    // Clear existing vehicles
    await Vehicle.deleteMany({});
    console.log('✓ Cleared old vehicle data');

    // Sample vehicle data
    const vehicles = await Vehicle.insertMany([
      {
        registrationNumber: '29B-123.45',
        make: 'Thaco',
        model: 'Mobihome',
        year: 2022,
        capacity: 40,
        status: 'active',
        color: 'Trắng',
        vin: '1HGBH41JXMN109186',
        notes: 'Xe giường nằm tuyến đường dài'
      },
      {
        registrationNumber: '30F-987.65',
        make: 'Hyundai',
        model: 'Universe',
        year: 2021,
        capacity: 45,
        status: 'active',
        color: 'Xanh dương',
        vin: '2HGBH41JXMN109187',
        notes: 'Xe khách chất lượng cao'
      },
      {
        registrationNumber: '15B-456.78',
        make: 'Samco',
        model: 'Felix',
        year: 2023,
        capacity: 29,
        status: 'maintenance',
        color: 'Đỏ',
        vin: '3HGBH41JXMN109188',
        notes: 'Đang bảo dưỡng định kỳ - kiểm tra phanh'
      },
      {
        registrationNumber: '14B-321.09',
        make: 'Thaco',
        model: 'County',
        year: 2020,
        capacity: 29,
        status: 'out-of-service',
        color: 'Bạc',
        vin: '4HGBH41JXMN109189',
        notes: 'Đang chờ phụ tùng sửa chữa động cơ'
      },
      {
        registrationNumber: '29B-555.55',
        make: 'Ford',
        model: 'Transit',
        year: 2019,
        capacity: 16,
        status: 'active',
        color: 'Xám',
        vin: '5HGBH41JXMN109190',
        notes: 'Xe Limousine tuyến ngắn'
      },
      {
        registrationNumber: '30E-111.22',
        make: 'Toyota',
        model: 'Hiace',
        year: 2015,
        capacity: 15,
        status: 'retired',
        color: 'Vàng',
        vin: '6HGBH41JXMN109191',
        notes: 'Đã thanh lý do hết niên hạn sử dụng'
      },
      {
        registrationNumber: '15B-888.99',
        make: 'Thaco',
        model: 'TB79S',
        year: 2022,
        capacity: 29,
        status: 'active',
        color: 'Xanh dương',
        vin: '7HGBH41JXMN109192',
        notes: 'Xe đặt tại Hải Phòng, chạy tuyến Hải Phòng - Hạ Long'
      }
    ]);

    console.log('✓ Created sample vehicles');

    // Inspection / maintenance dates relative to today, chosen so the header bell has
    // real alerts to show. Days: positive = in the future, negative = in the past.
    const MAINTENANCE_INFO = {
      '29B-123.45': { inspection: 200, lastMaintenance: -95 },  // periodic maintenance overdue
      '30F-987.65': { inspection: 20,  lastMaintenance: -30 },  // inspection expiring in 20 days
      '15B-456.78': { inspection: 300, lastMaintenance: -120 }, // in the garage now (seedMaintenance.js)
      '14B-321.09': { inspection: -10, lastMaintenance: -200 }, // inspection expired
      '29B-555.55': { inspection: 150, lastMaintenance: -84 },  // due in 6 days — already planned
      '15B-888.99': { inspection: 400, lastMaintenance: -10 },
    };
    const today = new Date();
    // Date-only values are stored as UTC midnight, like the frontend's date inputs
    const dateOnly = days => new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + days));
    for (const v of vehicles) {
      const info = MAINTENANCE_INFO[v.registrationNumber];
      if (!info) continue;
      v.inspectionExpiry = dateOnly(info.inspection);
      v.lastMaintenanceAt = new Date(today.getTime() + info.lastMaintenance * 24 * 60 * 60 * 1000);
      await v.save();
    }
    console.log('✓ Set inspection and maintenance dates');
    console.log('\n🎉 Vehicle seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Vehicles created: ${vehicles.length}`);
    console.log(`   Active: ${vehicles.filter(v => v.status === 'active').length}`);
    console.log(`   Maintenance: ${vehicles.filter(v => v.status === 'maintenance').length}`);
    console.log(`   Out-of-service: ${vehicles.filter(v => v.status === 'out-of-service').length}`);
    console.log(`   Retired: ${vehicles.filter(v => v.status === 'retired').length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Vehicle seed error:', error);
    process.exit(1);
  }
};

// Run seeder
seedVehicles();
