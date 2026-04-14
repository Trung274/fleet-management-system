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

    // 3. Tạo Manager Role (vehicle and driver management permissions)
    const managerPermissions = permissions
      .filter(p => p.resource === 'vehicles' || p.resource === 'drivers' || p.resource === 'profile')
      .map(p => p._id);

    const managerRole = await Role.create({
      name: 'manager',
      description: 'Manager with vehicle and driver management access',
      permissions: managerPermissions
    });
    console.log('✓ Created manager role');

    // 4. Tạo User Role (limited permissions)
    const userPermissions = permissions
      .filter(p => p.resource === 'profile')
      .map(p => p._id);

    const userRole = await Role.create({
      name: 'user',
      description: 'Regular user with limited access',
      permissions: userPermissions
    });
    console.log('✓ Created user role');

    // 5. Tạo tài khoản Admin mặc định (optional)
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: 'admin@example.com',
        password: 'Admin@123', // Đổi password này trong production!
        role: adminRole._id,
        isActive: true
      });
      console.log('✓ Created default admin account');
      console.log('  Email: admin@example.com');
      console.log('  Password: Admin@123');
      console.log('  ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Permissions: ${permissions.length}`);
    console.log(`   Roles: 3 (admin, manager, user)`);
    console.log(`   Users: ${adminExists ? 'Admin already exists' : '1 admin created'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

// Chạy seeder
seedData();