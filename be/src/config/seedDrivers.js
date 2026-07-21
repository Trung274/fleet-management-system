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
        firstName: 'Văn A',
        lastName: 'Nguyễn',
        email: 'nguyen.vana@example.com',
        phone: '0901234567',
        dateOfBirth: new Date('1985-03-15'),
        address: '123 Đường Xuân Thủy, Cầu Giấy, Hà Nội',
        licenseNumber: 'DL123456',
        licenseType: 'Class B',
        licenseExpiry: new Date('2028-06-30'),
        employmentStatus: 'active',
        hireDate: new Date('2020-01-15'),
        emergencyContact: {
          name: 'Trần Thị B',
          phone: '0901234568',
          relationship: 'Vợ'
        },
        notes: 'Tài xế nhiều kinh nghiệm, đã chạy tuyến đường dài hơn 10 năm'
      },
      {
        firstName: 'Văn B',
        lastName: 'Trần',
        email: 'tran.vanb@example.com',
        phone: '0912345678',
        dateOfBirth: new Date('1990-07-22'),
        address: '456 Đường Lạch Tray, Ngô Quyền, Hải Phòng',
        licenseNumber: 'DL234567',
        licenseType: 'Class A',
        licenseExpiry: new Date('2028-03-15'),
        employmentStatus: 'active',
        hireDate: new Date('2021-05-10'),
        emergencyContact: {
          name: 'Lê Thị C',
          phone: '0912345679',
          relationship: 'Mẹ'
        },
        notes: 'Chuyên chạy các tuyến cao tốc'
      },
      {
        firstName: 'Đức C',
        lastName: 'Phạm',
        email: 'pham.ducc@example.com',
        phone: '0923456789',
        dateOfBirth: new Date('1988-11-08'),
        address: '789 Đường Lê Thánh Tông, Hạ Long, Quảng Ninh',
        licenseNumber: 'DL345678',
        licenseType: 'Class B',
        licenseExpiry: new Date('2028-09-20'),
        employmentStatus: 'on-leave',
        hireDate: new Date('2019-08-20'),
        emergencyContact: {
          name: 'Hoàng Thị D',
          phone: '0923456780',
          relationship: 'Vợ'
        },
        notes: 'Đang nghỉ phép do lý do sức khỏe - dự kiến đi làm lại: 01/06/2026'
      },
      {
        firstName: 'Minh D',
        lastName: 'Hoàng',
        email: 'hoang.minhd@example.com',
        phone: '0934567890',
        dateOfBirth: new Date('1982-04-30'),
        address: '321 Đường Trường Chinh, Đống Đa, Hà Nội',
        licenseNumber: 'DL456789',
        licenseType: 'Class C',
        licenseExpiry: new Date('2028-12-31'),
        employmentStatus: 'suspended',
        hireDate: new Date('2018-03-12'),
        emergencyContact: {
          name: 'Phạm Thị E',
          phone: '0934567891',
          relationship: 'Chị gái'
        },
        notes: 'Đang tạm đình chỉ chờ điều tra sự cố - ngày xem xét: 15/05/2026'
      },
      {
        firstName: 'Quốc E',
        lastName: 'Lê',
        email: 'le.quoce@example.com',
        phone: '0945678901',
        dateOfBirth: new Date('1975-09-18'),
        address: '654 Đường Nguyễn Văn Linh, Lê Chân, Hải Phòng',
        licenseNumber: 'DL567890',
        licenseType: 'Class A',
        licenseExpiry: new Date('2028-05-10'),
        employmentStatus: 'active',
        hireDate: new Date('2015-11-01'),
        emergencyContact: {
          name: 'Nguyễn Thị F',
          phone: '0945678902',
          relationship: 'Vợ'
        },
        notes: 'Tài xế lâu năm - bằng lái sắp hết hạn, đã nhắc nhở gia hạn'
      },
      {
        firstName: 'Thành F',
        lastName: 'Vũ',
        email: 'vu.thanhf@example.com',
        phone: '0956789012',
        dateOfBirth: new Date('1980-12-05'),
        address: '987 Đường Trần Hưng Đạo, Ninh Bình',
        licenseNumber: 'DL678901',
        licenseType: 'Class B',
        licenseExpiry: new Date('2028-08-15'),
        employmentStatus: 'terminated',
        hireDate: new Date('2017-06-15'),
        terminationDate: new Date('2025-12-31'),
        emergencyContact: {
          name: 'Trần Thị G',
          phone: '0956789013',
          relationship: 'Vợ'
        },
        notes: 'Đã nghỉ hưu'
      },
      {
        firstName: 'Hoàng G',
        lastName: 'Đinh',
        email: 'dinh.hoangg@example.com',
        phone: '0967890123',
        dateOfBirth: new Date('1992-02-14'),
        address: '147 Đường Hai Bà Trưng, Nam Định',
        licenseNumber: 'DL789012',
        licenseType: 'Class C',
        licenseExpiry: new Date('2028-11-30'),
        employmentStatus: 'active',
        hireDate: new Date('2022-09-01'),
        emergencyContact: {
          name: 'Lê Thị H',
          phone: '0967890124',
          relationship: 'Vợ'
        },
        notes: 'Nhân viên mới - đã hoàn thành chương trình đào tạo'
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
