require('dotenv').config();
const mongoose = require('mongoose');
const Trip = require('../models/Trip.model');
const Route = require('../models/Route.model');
const Vehicle = require('../models/Vehicle.model');
const Driver = require('../models/Driver.model');

// Connect to database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedTrips = async () => {
  try {
    console.log('🌱 Starting trip seed process...');

    // Clear existing trips
    await Trip.deleteMany({});
    console.log('✓ Cleared old trip data');

    // Get active routes, vehicles, and drivers
    // Look routes up by code so adding new routes doesn't shift which ones are used
    const activeRoutes = await Route.find({ status: 'active' });
    const routeByCode = Object.fromEntries(activeRoutes.map(r => [r.code, r]));
    const routes = ['HN-HP-01', 'HN-TB-01', 'HN-NB-01'].map(code => routeByCode[code]).filter(Boolean);
    // 15B-888.99 is reserved for the Hải Phòng - Hạ Long itinerary leg below
    const vehicles = await Vehicle.find({ status: 'active', registrationNumber: { $ne: '15B-888.99' } }).limit(3);
    const drivers = await Driver.find({ employmentStatus: 'active' }).limit(4);

    if (routes.length < 3 || vehicles.length < 3 || drivers.length < 4) {
      console.error('❌ Not enough active resources. Please seed routes, vehicles, and drivers first.');
      process.exit(1);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Create sample trips
    const trips = [];

    // Trip 1: Completed trip (yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    trips.push({
      route: routes[0]._id,
      vehicle: vehicles[0]._id,
      driver: drivers[0]._id,
      scheduledDeparture: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000), // 8:00 AM
      scheduledArrival: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM
      actualDeparture: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000 + 5 * 60 * 1000), // 8:05 AM
      actualArrival: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000 + 10 * 60 * 1000), // 9:10 AM
      status: 'completed',
      passengerCount: 42,
      fare: 150000,
      notes: 'Chuyến đi hoàn thành tốt đẹp'
    });

    // Trip 2: Completed trip (yesterday afternoon)
    trips.push({
      route: routes[1]._id,
      vehicle: vehicles[1]._id,
      driver: drivers[1]._id,
      scheduledDeparture: new Date(yesterday.getTime() + 14 * 60 * 60 * 1000), // 2:00 PM
      scheduledArrival: new Date(yesterday.getTime() + 15 * 60 * 60 * 1000), // 3:00 PM
      actualDeparture: new Date(yesterday.getTime() + 14 * 60 * 60 * 1000),
      actualArrival: new Date(yesterday.getTime() + 14 * 60 * 60 * 1000 + 55 * 60 * 1000), // 2:55 PM
      status: 'completed',
      passengerCount: 38,
      fare: 120000,
      notes: 'Đến sớm hơn dự kiến'
    });

    // Trip 3: Cancelled trip (yesterday)
    trips.push({
      route: routes[2]._id,
      vehicle: vehicles[2]._id,
      driver: drivers[2]._id,
      scheduledDeparture: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000), // 6:00 PM
      scheduledArrival: new Date(yesterday.getTime() + 19 * 60 * 60 * 1000), // 7:00 PM
      status: 'cancelled',
      cancellationReason: 'Xe gặp sự cố hỏng hóc giữa đường',
      fare: 45000
    });

    // Trip 4: In-progress trip (today, started 30 minutes ago)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const inOneHour = new Date(now.getTime() + 30 * 60 * 1000);
    trips.push({
      route: routes[0]._id,
      vehicle: vehicles[0]._id,
      driver: drivers[0]._id,
      scheduledDeparture: thirtyMinutesAgo,
      scheduledArrival: inOneHour,
      actualDeparture: new Date(thirtyMinutesAgo.getTime() + 2 * 60 * 1000), // 2 minutes late
      status: 'in-progress',
      fare: 150000,
      notes: 'Đang di chuyển trên tuyến'
    });

    // Trip 5: Scheduled trip (today, in 2 hours)
    const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const inThreeHours = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    trips.push({
      route: routes[1]._id,
      vehicle: vehicles[1]._id,
      driver: drivers[1]._id,
      scheduledDeparture: inTwoHours,
      scheduledArrival: inThreeHours,
      status: 'scheduled',
      fare: 120000
    });

    // Trip 6: Scheduled trip (today, in 4 hours)
    const inFourHours = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const inFiveHours = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    trips.push({
      route: routes[2]._id,
      vehicle: vehicles[2]._id,
      driver: drivers[2]._id,
      scheduledDeparture: inFourHours,
      scheduledArrival: inFiveHours,
      status: 'scheduled',
      fare: 45000
    });

    // Trip 7: Delayed trip (today, in 6 hours)
    const inSixHours = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const inSevenHours = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    trips.push({
      route: routes[0]._id,
      vehicle: vehicles[0]._id,
      driver: drivers[3]._id,
      scheduledDeparture: inSixHours,
      scheduledArrival: inSevenHours,
      status: 'delayed',
      delayReason: 'Tắc đường tại trạm thu phí',
      delayDuration: 30,
      fare: 150000
    });

    // Trip 8: Scheduled trip (tomorrow morning)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    trips.push({
      route: routes[1]._id,
      vehicle: vehicles[1]._id,
      driver: drivers[1]._id,
      scheduledDeparture: new Date(tomorrow.getTime() + 7 * 60 * 60 * 1000), // 7:00 AM
      scheduledArrival: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000), // 8:00 AM
      status: 'scheduled',
      fare: 120000
    });

    // Trip 9: Scheduled trip (tomorrow afternoon)
    trips.push({
      route: routes[2]._id,
      vehicle: vehicles[2]._id,
      driver: drivers[2]._id,
      scheduledDeparture: new Date(tomorrow.getTime() + 15 * 60 * 60 * 1000), // 3:00 PM
      scheduledArrival: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000), // 4:00 PM
      status: 'scheduled',
      fare: 45000
    });

    // Trip 10: Scheduled trip (day after tomorrow)
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    trips.push({
      route: routes[0]._id,
      vehicle: vehicles[0]._id,
      driver: drivers[0]._id,
      scheduledDeparture: new Date(dayAfterTomorrow.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM
      scheduledArrival: new Date(dayAfterTomorrow.getTime() + 10 * 60 * 60 * 1000), // 10:00 AM
      status: 'scheduled',
      fare: 150000
    });

    // Trip 11: Completed trip with high passenger count (2 days ago)
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    trips.push({
      route: routes[1]._id,
      vehicle: vehicles[1]._id,
      driver: drivers[1]._id,
      scheduledDeparture: new Date(twoDaysAgo.getTime() + 10 * 60 * 60 * 1000), // 10:00 AM
      scheduledArrival: new Date(twoDaysAgo.getTime() + 11 * 60 * 60 * 1000), // 11:00 AM
      actualDeparture: new Date(twoDaysAgo.getTime() + 10 * 60 * 60 * 1000),
      actualArrival: new Date(twoDaysAgo.getTime() + 11 * 60 * 60 * 1000 + 5 * 60 * 1000), // 11:05 AM
      status: 'completed',
      passengerCount: 48,
      fare: 120000,
      notes: 'Chuyến đi đầy đủ khách'
    });

    // Trip 12: Cancelled trip with delay (3 days ago)
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    trips.push({
      route: routes[2]._id,
      vehicle: vehicles[2]._id,
      driver: drivers[2]._id,
      scheduledDeparture: new Date(threeDaysAgo.getTime() + 16 * 60 * 60 * 1000), // 4:00 PM
      scheduledArrival: new Date(threeDaysAgo.getTime() + 17 * 60 * 60 * 1000), // 5:00 PM
      status: 'cancelled',
      cancellationReason: 'Tài xế nghỉ ốm đột xuất',
      fare: 45000
    });

    // ─── Connecting trips for multi-trip itineraries (3 days from now) ───
    // Each leg uses a different vehicle and driver; arrival follows route.estimatedDuration.
    // Seeded bookings for these legs are created in seedBookings.js.
    const inThreeDays = new Date(today);
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    const at = (hours, minutes = 0) => new Date(inThreeDays.getTime() + (hours * 60 + minutes) * 60 * 1000);
    const plusMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);
    const vehicleByReg = Object.fromEntries(
      (await Vehicle.find({ status: 'active' })).map(v => [v.registrationNumber, v])
    );
    const tbnd = routeByCode['TB-ND-01'];
    const hphl = routeByCode['HP-HL-01'];
    const hpVehicle = vehicleByReg['15B-888.99'];

    if (tbnd && hphl && hpVehicle) {
      // Itinerary A: Hà Nội → Thái Bình → Nam Định (60 min transfer at Bến xe Thái Bình)
      const legA1Departure = at(7);
      const legA2Departure = at(11);
      trips.push({
        route: routes[1]._id,
        vehicle: vehicles[1]._id,
        driver: drivers[1]._id,
        scheduledDeparture: legA1Departure,
        scheduledArrival: plusMinutes(legA1Departure, routes[1].estimatedDuration), // 10:00
        status: 'scheduled',
        fare: 120000,
        notes: 'Chặng 1 của hành trình Hà Nội → Nam Định'
      });
      trips.push({
        route: tbnd._id,
        vehicle: vehicles[2]._id,
        driver: drivers[2]._id,
        scheduledDeparture: legA2Departure,
        scheduledArrival: plusMinutes(legA2Departure, tbnd.estimatedDuration), // 12:00
        status: 'scheduled',
        fare: 60000,
        notes: 'Chặng 2 của hành trình Hà Nội → Nam Định'
      });

      // Itinerary B: Hà Nội → Hải Phòng → Hạ Long (60 min transfer at Bến xe Niệm Nghĩa)
      // Leg 1 is delayed 45 min, leaving only 15 min to transfer → itinerary shows "at risk"
      const legB1Departure = at(8);
      const legB2Departure = at(10, 30);
      trips.push({
        route: routes[0]._id,
        vehicle: vehicles[0]._id,
        driver: drivers[0]._id,
        scheduledDeparture: legB1Departure,
        scheduledArrival: plusMinutes(legB1Departure, routes[0].estimatedDuration), // 09:30
        status: 'delayed',
        delayReason: 'Tai nạn trên cao tốc, đang phân luồng',
        delayDuration: 45,
        fare: 150000,
        notes: 'Chặng 1 của hành trình Hà Nội → Hạ Long'
      });
      trips.push({
        route: hphl._id,
        vehicle: hpVehicle._id,
        driver: drivers[3]._id,
        scheduledDeparture: legB2Departure,
        scheduledArrival: plusMinutes(legB2Departure, hphl.estimatedDuration), // 12:00
        status: 'scheduled',
        fare: 90000,
        notes: 'Chặng 2 của hành trình Hà Nội → Hạ Long'
      });
    } else {
      console.log('⚠️  Connecting routes or vehicle 15B-888.99 missing — skipped itinerary trips');
    }

    const createdTrips = await Trip.insertMany(trips);
    console.log('✓ Created sample trips');

    console.log('\n🎉 Trip seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Trips created: ${createdTrips.length}`);
    console.log(`   Scheduled: ${createdTrips.filter(t => t.status === 'scheduled').length}`);
    console.log(`   In-progress: ${createdTrips.filter(t => t.status === 'in-progress').length}`);
    console.log(`   Completed: ${createdTrips.filter(t => t.status === 'completed').length}`);
    console.log(`   Cancelled: ${createdTrips.filter(t => t.status === 'cancelled').length}`);
    console.log(`   Delayed: ${createdTrips.filter(t => t.status === 'delayed').length}`);
    console.log(`   Routes used: ${routes.length}`);
    console.log(`   Vehicles used: ${vehicles.length}`);
    console.log(`   Drivers used: ${drivers.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Trip seed error:', error);
    process.exit(1);
  }
};

// Run seeder
seedTrips();
