require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  { name: 'Roles & Permissions', file: 'seedRolesPermissions.js' },
  { name: 'Users',               file: 'seedUsers.js' },
  { name: 'Vehicles',            file: 'seedVehicles.js' },
  { name: 'Drivers',             file: 'seedDrivers.js' },
  { name: 'Routes',              file: 'seedRoutes.js' },
  { name: 'Trips',               file: 'seedTrips.js' },
  { name: 'Bookings & Seats',    file: 'seedBookings.js' },
];

console.log('🚀 Fleet Management System — Full Database Seed');
console.log('='.repeat(50));

for (const script of scripts) {
  console.log(`\n▶  Seeding: ${script.name}...`);
  try {
    execSync(
      `node "${path.join(__dirname, script.file)}"`,
      { stdio: 'inherit', timeout: 30000 }
    );
  } catch (err) {
    console.error(`\n❌ Failed at: ${script.name}`);
    process.exit(1);
  }
}

console.log('\n' + '='.repeat(50));
console.log('✅  All seeds completed successfully!');
