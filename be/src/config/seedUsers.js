require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Role = require('../models/Role.model');
const Permission = require('../models/Permission.model');

// Kết nối database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedUsers = async () => {
  try {
    console.log('🌱 Starting user seed process...');

    // Lấy các role đã tồn tại (phải chạy seedRolesPermissions trước)
    const adminRole    = await Role.findOne({ name: 'admin' });
    const managerRole  = await Role.findOne({ name: 'manager' });
    const staffRole    = await Role.findOne({ name: 'staff' });
    const userRole     = await Role.findOne({ name: 'user' });

    if (!managerRole || !staffRole || !userRole) {
      console.error('❌ Roles not found. Please run npm run seed:roles first.');
      process.exit(1);
    }

    // Xóa toàn bộ user trừ admin mặc định để tránh trùng email
    await User.deleteMany({ email: { $nin: ['admin@example.com'] } });
    console.log('✓ Cleared old user data (kept admin account)');

    const usersToCreate = [
      // ─── Manager accounts ────────────────────────────────────
      {
        name: 'Trần Quản Lý',
        email: 'manager@example.com',
        password: 'Manager@123',
        role: managerRole._id,
        isActive: true
      },
      {
        name: 'Lê Thị Hương',
        email: 'le.huong@example.com',
        password: 'Manager@123',
        role: managerRole._id,
        isActive: true
      },

      // ─── Staff accounts ───────────────────────────────────────
      {
        name: 'Phạm Văn Nhân',
        email: 'staff@example.com',
        password: 'Staff@123',
        role: staffRole._id,
        isActive: true
      },
      {
        name: 'Nguyễn Thị Mai',
        email: 'nguyen.mai@example.com',
        password: 'Staff@123',
        role: staffRole._id,
        isActive: true
      },
      {
        name: 'Vũ Đức Thắng',
        email: 'vu.thang@example.com',
        password: 'Staff@123',
        role: staffRole._id,
        isActive: true
      },
      {
        name: 'Hoàng Thị Lan',
        email: 'hoang.lan@example.com',
        password: 'Staff@123',
        role: staffRole._id,
        isActive: false  // Tài khoản bị vô hiệu hóa (để test)
      },

      // ─── Regular user accounts ────────────────────────────────
      {
        name: 'Nguyễn Văn An',
        email: 'nguyen.an@example.com',
        password: 'User@1234',
        role: userRole._id,
        isActive: true
      },
      {
        name: 'Trần Thị Bình',
        email: 'tran.binh@example.com',
        password: 'User@1234',
        role: userRole._id,
        isActive: true
      },
      {
        name: 'Lê Minh Tuấn',
        email: 'le.tuan@example.com',
        password: 'User@1234',
        role: userRole._id,
        isActive: true
      },
      {
        name: 'Phạm Thị Cúc',
        email: 'pham.cuc@example.com',
        password: 'User@1234',
        role: userRole._id,
        isActive: true
      }
    ];

    const createdUsers = [];
    for (const userData of usersToCreate) {
      const user = await User.create(userData);
      createdUsers.push(user);
    }

    const managers = createdUsers.filter(u => String(u.role) === String(managerRole._id));
    const staffs   = createdUsers.filter(u => String(u.role) === String(staffRole._id));
    const users    = createdUsers.filter(u => String(u.role) === String(userRole._id));

    console.log('✓ Created sample users');
    console.log('\n🎉 User seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Managers created : ${managers.length}`);
    console.log(`   Staff created    : ${staffs.length}`);
    console.log(`   Users created    : ${users.length}`);
    console.log('\n🔑 Test credentials:');
    console.log('   admin@example.com    / Admin@123   (admin)');
    console.log('   manager@example.com  / Manager@123 (manager)');
    console.log('   staff@example.com    / Staff@123   (staff)');
    console.log('   nguyen.an@example.com / User@1234  (user)');

    process.exit(0);
  } catch (error) {
    console.error('❌ User seed error:', error);
    process.exit(1);
  }
};

// Run seeder
seedUsers();
