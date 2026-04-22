require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/Role.model');
const Permission = require('../models/Permission.model');
const User = require('../models/User.model');

// Kết nối database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedData = async () => {
  try {
    console.log('🌱 Starting seed process...');

    // Xóa dữ liệu cũ
    await Permission.deleteMany({});
    await Role.deleteMany({});
    await User.deleteMany({});
    console.log('✓ Cleared old data');

    // 1. Tạo Permissions
    const permissions = await Permission.insertMany([
      // User Management
      { resource: 'users', action: 'create', description: 'Create new users' },
      { resource: 'users', action: 'read', description: 'View user details' },
      { resource: 'users', action: 'update', description: 'Update user information' },
      { resource: 'users', action: 'delete', description: 'Delete users' },
      { resource: 'users', action: 'list', description: 'List all users' },

      // Role Management
      { resource: 'roles', action: 'create', description: 'Create new roles' },
      { resource: 'roles', action: 'read', description: 'View role details' },
      { resource: 'roles', action: 'update', description: 'Update roles' },
      { resource: 'roles', action: 'delete', description: 'Delete roles' },
      { resource: 'roles', action: 'list', description: 'List all roles' },

      // Permission Management
      { resource: 'permissions', action: 'create', description: 'Create permissions' },
      { resource: 'permissions', action: 'read', description: 'View permissions' },
      { resource: 'permissions', action: 'update', description: 'Update permissions' },
      { resource: 'permissions', action: 'delete', description: 'Delete permissions' },
      { resource: 'permissions', action: 'list', description: 'List all permissions' },

      // Profile Management (cho user thường)
      { resource: 'profile', action: 'read', description: 'View own profile' },
      { resource: 'profile', action: 'update', description: 'Update own profile' },

      // Vehicle Management
      { resource: 'vehicles', action: 'create', description: 'Create new vehicles' },
      { resource: 'vehicles', action: 'read', description: 'View vehicle details' },
      { resource: 'vehicles', action: 'update', description: 'Update vehicle information' },
      { resource: 'vehicles', action: 'delete', description: 'Delete vehicles' },

      // Driver Management
      { resource: 'drivers', action: 'create', description: 'Create new drivers' },
      { resource: 'drivers', action: 'read', description: 'View driver details' },
      { resource: 'drivers', action: 'update', description: 'Update driver information' },
      { resource: 'drivers', action: 'delete', description: 'Delete drivers' },

      // Route Management
      { resource: 'routes', action: 'create', description: 'Create new routes' },
      { resource: 'routes', action: 'read', description: 'View route details' },
      { resource: 'routes', action: 'update', description: 'Update route information' },
      { resource: 'routes', action: 'delete', description: 'Delete routes' },

      // Trip Management
      { resource: 'trips', action: 'create', description: 'Create new trips' },
      { resource: 'trips', action: 'read', description: 'View trip details' },
      { resource: 'trips', action: 'update', description: 'Update trip information' },
      { resource: 'trips', action: 'delete', description: 'Delete trips' },

      // Seat Management
      { resource: 'seats', action: 'read', description: 'View seat map and availability' },
      { resource: 'seats', action: 'update', description: 'Initialize seats and update seat status' },

      // Booking Management
      { resource: 'bookings', action: 'create', description: 'Create new bookings' },
      { resource: 'bookings', action: 'read', description: 'View booking details' },
      { resource: 'bookings', action: 'update', description: 'Confirm or cancel bookings' },
      { resource: 'bookings', action: 'delete', description: 'Delete booking records' },
    ]);
    console.log('✓ Created permissions');

    // 2. Tạo Admin Role (full permissions)
    const adminPermissions = permissions.map(p => p._id);
    const adminRole = await Role.create({
      name: 'admin',
      description: 'Administrator with full access',
      permissions: adminPermissions
    });
    console.log('✓ Created admin role');

    // 3. Tạo Manager Role (full operational access + seats + bookings)
    const managerPermissions = permissions
      .filter(p => ['vehicles', 'drivers', 'routes', 'trips', 'seats', 'bookings', 'profile'].includes(p.resource))
      .map(p => p._id);

    const managerRole = await Role.create({
      name: 'manager',
      description: 'Manager with full operational access including seat and booking management',
      permissions: managerPermissions
    });
    console.log('✓ Created manager role');

    // 4. Tạo Staff Role (seats:read + bookings:create/read/update — no delete, no seat init)
    const staffPermissions = permissions
      .filter(p =>
        (p.resource === 'trips' && p.action === 'read') ||
        (p.resource === 'seats' && p.action === 'read') ||
        (p.resource === 'bookings' && ['create', 'read', 'update'].includes(p.action)) ||
        p.resource === 'profile'
      )
      .map(p => p._id);

    const staffRole = await Role.create({
      name: 'staff',
      description: 'Counter staff with booking management access (create, view, confirm, cancel)',
      permissions: staffPermissions
    });
    console.log('✓ Created staff role');

    // 5. Tạo User Role (limited permissions)
    const userPermissions = permissions
      .filter(p => p.resource === 'profile')
      .map(p => p._id);

    const userRole = await Role.create({
      name: 'user',
      description: 'Regular user with limited access',
      permissions: userPermissions
    });
    console.log('✓ Created user role');

    // 6. Tạo tài khoản Admin mặc định
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: 'admin@example.com',
        password: 'Admin@123',
        role: adminRole._id,
        isActive: true
      });
      console.log('✓ Created default admin account (admin@example.com / Admin@123)');
    }

    // 7. Tạo tài khoản Staff mặc định (dùng cho testing)
    const staffExists = await User.findOne({ email: 'staff@example.com' });
    if (!staffExists) {
      await User.create({
        name: 'Counter Staff',
        email: 'staff@example.com',
        password: 'Staff@123',
        role: staffRole._id,
        isActive: true
      });
      console.log('✓ Created default staff account (staff@example.com / Staff@123)');
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Permissions: ${permissions.length}`);
    console.log(`   Roles: 4 (admin, manager, staff, user)`);
    console.log(`   Users: admin + staff accounts`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

// Chạy seeder
seedData();