require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('../models/Driver.model');

// Connect to database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedDrivers = async () => {
  try {
    console.log('🌱 Starting driver seed process...');

    // Clear existing drivers
    await Driver.deleteMany({});
    console.log('✓ Cleared old driver data');

    // Sample driver data
    const drivers = await Driver.insertMany([
      {
        firstName: 'Michael',
        lastName: 'Johnson',
        email: 'michael.johnson@example.com',
        phone: '+1234567890',
        dateOfBirth: new Date('1985-03-15'),
        address: '123 Oak Street, Springfield, IL 62701',
        licenseNumber: 'DL123456',
        licenseType: 'Class B',
        licenseExpiry: new Date('2026-06-30'),
        employmentStatus: 'active',
        hireDate: new Date('2020-01-15'),
        emergencyContact: {
          name: 'Sarah Johnson',
          phone: '+1234567891',
          relationship: 'Spouse'
        },
        notes: 'Experienced driver with 10+ years of commercial driving experience'
      },
      {
        firstName: 'David',
        lastName: 'Martinez',
        email: 'david.martinez@example.com',
        phone: '+1234567892',
        dateOfBirth: new Date('1990-07-22'),
        address: '456 Maple Avenue, Chicago, IL 60601',
        licenseNumber: 'DL234567',
        licenseType: 'Class A',
        licenseExpiry: new Date('2027-03-15'),
        employmentStatus: 'active',
        hireDate: new Date('2021-05-10'),
        emergencyContact: {
          name: 'Maria Martinez',
          phone: '+1234567893',
          relationship: 'Mother'
        },
        notes: 'Certified for long-distance routes'
      },
      {
        firstName: 'Robert',
        lastName: 'Williams',
        email: 'robert.williams@example.com',
        phone: '+1234567894',
        dateOfBirth: new Date('1988-11-08'),
        address: '789 Pine Road, Boston, MA 02101',
        licenseNumber: 'DL345678',
        licenseType: 'Class B',
        licenseExpiry: new Date('2026-09-20'),
        employmentStatus: 'on-leave',
        hireDate: new Date('2019-08-20'),
        emergencyContact: {
          name: 'Jennifer Williams',
          phone: '+1234567895',
          relationship: 'Spouse'
        },
        notes: 'On medical leave - expected return date: 2026-06-01'
      },
      {
        firstName: 'James',
        lastName: 'Brown',
        email: 'james.brown@example.com',
        phone: '+1234567896',
        dateOfBirth: new Date('1982-04-30'),
        address: '321 Elm Street, Seattle, WA 98101',
        licenseNumber: 'DL456789',
        licenseType: 'Class C',
        licenseExpiry: new Date('2026-12-31'),
        employmentStatus: 'suspended',
        hireDate: new Date('2018-03-12'),
        emergencyContact: {
          name: 'Patricia Brown',
          phone: '+1234567897',
          relationship: 'Sister'
        },
        notes: 'Suspended pending investigation - review date: 2026-05-15'
      },
      {
        firstName: 'Christopher',
        lastName: 'Davis',
        email: 'christopher.davis@example.com',
        phone: '+1234567898',
        dateOfBirth: new Date('1975-09-18'),
        address: '654 Birch Lane, Portland, OR 97201',
        licenseNumber: 'DL567890',
        licenseType: 'Class A',
        licenseExpiry: new Date('2026-05-10'),
        employmentStatus: 'active',
        hireDate: new Date('2015-11-01'),
        emergencyContact: {
          name: 'Linda Davis',
          phone: '+1234567899',
          relationship: 'Spouse'
        },
        notes: 'Senior driver - license expiring soon, renewal reminder sent'
      },
      {
        firstName: 'Thomas',
        lastName: 'Miller',
        email: 'thomas.miller@example.com',
        phone: '+1234567800',
        dateOfBirth: new Date('1980-12-05'),
        address: '987 Cedar Court, Denver, CO 80201',
        licenseNumber: 'DL678901',
        licenseType: 'Class B',
        licenseExpiry: new Date('2027-08-15'),
        employmentStatus: 'terminated',
        hireDate: new Date('2017-06-15'),
        terminationDate: new Date('2025-12-31'),
        emergencyContact: {
          name: 'Nancy Miller',
          phone: '+1234567801',
          relationship: 'Spouse'
        },
        notes: 'Terminated - retirement'
      },
      {
        firstName: 'Daniel',
        lastName: 'Wilson',
        email: 'daniel.wilson@example.com',
        phone: '+1234567802',
        dateOfBirth: new Date('1992-02-14'),
        address: '147 Spruce Street, Austin, TX 78701',
        licenseNumber: 'DL789012',
        licenseType: 'Class C',
        licenseExpiry: new Date('2027-11-30'),
        employmentStatus: 'active',
        hireDate: new Date('2022-09-01'),
        emergencyContact: {
          name: 'Emily Wilson',
          phone: '+1234567803',
          relationship: 'Spouse'
        },
        notes: 'New hire - completed training program'
      }
    ]);

    console.log('✓ Created sample drivers');
    console.log('\n🎉 Driver seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Drivers created: ${drivers.length}`);
    console.log(`   Active: ${drivers.filter(d => d.employmentStatus === 'active').length}`);
    console.log(`   On-leave: ${drivers.filter(d => d.employmentStatus === 'on-leave').length}`);
    console.log(`   Suspended: ${drivers.filter(d => d.employmentStatus === 'suspended').length}`);
    console.log(`   Terminated: ${drivers.filter(d => d.employmentStatus === 'terminated').length}`);
    console.log(`   Class A licenses: ${drivers.filter(d => d.licenseType === 'Class A').length}`);
    console.log(`   Class B licenses: ${drivers.filter(d => d.licenseType === 'Class B').length}`);
    console.log(`   Class C licenses: ${drivers.filter(d => d.licenseType === 'Class C').length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Driver seed error:', error);
    process.exit(1);
  }
};

// Run seeder
seedDrivers();
