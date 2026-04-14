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
        registrationNumber: 'BUS-001',
        make: 'Mercedes-Benz',
        model: 'Sprinter',
        year: 2022,
        capacity: 20,
        status: 'active',
        color: 'White',
        vin: '1HGBH41JXMN109186',
        notes: 'Primary city route vehicle'
      },
      {
        registrationNumber: 'BUS-002',
        make: 'Volvo',
        model: 'B8R',
        year: 2021,
        capacity: 45,
        status: 'active',
        color: 'Blue',
        vin: '2HGBH41JXMN109187',
        notes: 'Long-distance route vehicle'
      },
      {
        registrationNumber: 'BUS-003',
        make: 'Scania',
        model: 'Touring',
        year: 2023,
        capacity: 50,
        status: 'maintenance',
        color: 'Red',
        vin: '3HGBH41JXMN109188',
        notes: 'Scheduled maintenance - brake system check'
      },
      {
        registrationNumber: 'BUS-004',
        make: 'MAN',
        model: 'Lion\'s Coach',
        year: 2020,
        capacity: 55,
        status: 'out-of-service',
        color: 'Silver',
        vin: '4HGBH41JXMN109189',
        notes: 'Awaiting parts for engine repair'
      },
      {
        registrationNumber: 'BUS-005',
        make: 'Isuzu',
        model: 'Novo Ultra',
        year: 2019,
        capacity: 30,
        status: 'active',
        color: 'Green',
        vin: '5HGBH41JXMN109190',
        notes: 'Suburban route vehicle'
      },
      {
        registrationNumber: 'BUS-006',
        make: 'Mercedes-Benz',
        model: 'Citaro',
        year: 2015,
        capacity: 40,
        status: 'retired',
        color: 'Yellow',
        vin: '6HGBH41JXMN109191',
        notes: 'Retired due to age and high mileage'
      }
    ]);

    console.log('✓ Created sample vehicles');
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
