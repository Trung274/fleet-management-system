require('dotenv').config();
const mongoose = require('mongoose');
const Route = require('../models/Route.model');
const RouteStop = require('../models/RouteStop.model');

// Connect to database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedRoutes = async () => {
  try {
    console.log('🌱 Starting route seed process...');

    // Clear existing routes and stops
    await RouteStop.deleteMany({});
    await Route.deleteMany({});
    console.log('✓ Cleared old route and stop data');

    // Create routes
    const routes = await Route.insertMany([
      {
        name: 'Downtown Express',
        code: 'RT-001',
        description: 'Express route connecting downtown business district to residential areas',
        origin: 'Central Station',
        destination: 'Northside Terminal',
        distance: 25.5,
        status: 'active',
        serviceType: 'express',
        estimatedDuration: 45
      },
      {
        name: 'Eastside Local',
        code: 'RT-002',
        description: 'Local route serving eastside neighborhoods with frequent stops',
        origin: 'East Plaza',
        destination: 'Riverside Mall',
        distance: 18.3,
        status: 'active',
        serviceType: 'local',
        estimatedDuration: 60
      },
      {
        name: 'Airport Shuttle',
        code: 'RT-003',
        description: 'Direct shuttle service between downtown and airport',
        origin: 'City Center',
        destination: 'International Airport',
        distance: 32.0,
        status: 'active',
        serviceType: 'shuttle',
        estimatedDuration: 40
      },
      {
        name: 'Westside Loop',
        code: 'RT-004',
        description: 'Circular route covering western suburbs',
        origin: 'West Station',
        destination: 'West Station',
        distance: 28.7,
        status: 'under-maintenance',
        serviceType: 'local',
        estimatedDuration: 75
      },
      {
        name: 'Old Highway Route',
        code: 'RT-005',
        description: 'Legacy route discontinued due to new highway construction',
        origin: 'South Terminal',
        destination: 'North Terminal',
        distance: 45.2,
        status: 'discontinued',
        serviceType: 'express',
        estimatedDuration: 90,
        discontinuedDate: new Date('2025-12-31')
      }
    ]);

    console.log('✓ Created sample routes');

    // Create route stops for each route
    const routeStops = [];

    // Stops for RT-001 (Downtown Express) - times in minutes from midnight
    routeStops.push(
      {
        route: routes[0]._id,
        stopName: 'Central Station',
        stopCode: 'CS-001',
        address: '100 Main Street, Downtown',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 480,  // 08:00
        estimatedDepartureTime: 480,
        coordinates: { latitude: 40.7128, longitude: -74.0060 }
      },
      {
        route: routes[0]._id,
        stopName: 'Business District Hub',
        stopCode: 'BDH-001',
        address: '500 Commerce Ave, Downtown',
        sequence: 2,
        distanceFromStart: 5.2,
        estimatedArrivalTime: 492,  // 08:12
        estimatedDepartureTime: 494,  // 08:14
        coordinates: { latitude: 40.7200, longitude: -74.0100 }
      },
      {
        route: routes[0]._id,
        stopName: 'Midtown Plaza',
        stopCode: 'MP-001',
        address: '1200 Park Avenue, Midtown',
        sequence: 3,
        distanceFromStart: 12.8,
        estimatedArrivalTime: 505,  // 08:25
        estimatedDepartureTime: 507,  // 08:27
        coordinates: { latitude: 40.7350, longitude: -74.0200 }
      },
      {
        route: routes[0]._id,
        stopName: 'Northside Terminal',
        stopCode: 'NT-001',
        address: '2000 North Street, Northside',
        sequence: 4,
        distanceFromStart: 25.5,
        estimatedArrivalTime: 525,  // 08:45
        estimatedDepartureTime: 525,
        coordinates: { latitude: 40.7580, longitude: -74.0350 }
      }
    );

    // Stops for RT-002 (Eastside Local) - times in minutes from midnight
    routeStops.push(
      {
        route: routes[1]._id,
        stopName: 'East Plaza',
        stopCode: 'EP-001',
        address: '300 East Boulevard, Eastside',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 540,  // 09:00
        estimatedDepartureTime: 540,
        coordinates: { latitude: 40.7100, longitude: -73.9800 }
      },
      {
        route: routes[1]._id,
        stopName: 'Eastside Mall',
        stopCode: 'EM-001',
        address: '800 Shopping Center Drive, Eastside',
        sequence: 2,
        distanceFromStart: 6.5,
        estimatedArrivalTime: 560,  // 09:20
        estimatedDepartureTime: 562,  // 09:22
        coordinates: { latitude: 40.7150, longitude: -73.9700 }
      },
      {
        route: routes[1]._id,
        stopName: 'Riverside Park',
        stopCode: 'RP-001',
        address: '1500 River Road, Eastside',
        sequence: 3,
        distanceFromStart: 12.0,
        estimatedArrivalTime: 578,  // 09:38
        estimatedDepartureTime: 580,  // 09:40
        coordinates: { latitude: 40.7220, longitude: -73.9600 }
      },
      {
        route: routes[1]._id,
        stopName: 'Riverside Mall',
        stopCode: 'RM-001',
        address: '2200 Riverside Avenue, Eastside',
        sequence: 4,
        distanceFromStart: 18.3,
        estimatedArrivalTime: 600,  // 10:00
        estimatedDepartureTime: 600,
        coordinates: { latitude: 40.7300, longitude: -73.9500 }
      }
    );

    // Stops for RT-003 (Airport Shuttle) - times in minutes from midnight
    routeStops.push(
      {
        route: routes[2]._id,
        stopName: 'City Center',
        stopCode: 'CC-001',
        address: '50 City Plaza, Downtown',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 360,  // 06:00
        estimatedDepartureTime: 360,
        coordinates: { latitude: 40.7150, longitude: -74.0080 }
      },
      {
        route: routes[2]._id,
        stopName: 'Highway Junction',
        stopCode: 'HJ-001',
        address: 'Interstate 95 Exit 12',
        sequence: 2,
        distanceFromStart: 15.0,
        estimatedArrivalTime: 380,  // 06:20
        estimatedDepartureTime: 382,  // 06:22
        coordinates: { latitude: 40.7400, longitude: -74.0500 }
      },
      {
        route: routes[2]._id,
        stopName: 'International Airport',
        stopCode: 'IA-001',
        address: '1 Airport Drive, Airport District',
        sequence: 3,
        distanceFromStart: 32.0,
        estimatedArrivalTime: 400,  // 06:40
        estimatedDepartureTime: 400,
        coordinates: { latitude: 40.7700, longitude: -74.0900 }
      }
    );

    // Stops for RT-004 (Westside Loop) - times in minutes from midnight
    routeStops.push(
      {
        route: routes[3]._id,
        stopName: 'West Station',
        stopCode: 'WS-001',
        address: '400 West Avenue, Westside',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 600,  // 10:00
        estimatedDepartureTime: 600,
        coordinates: { latitude: 40.7050, longitude: -74.0400 }
      },
      {
        route: routes[3]._id,
        stopName: 'Suburban Center',
        stopCode: 'SC-001',
        address: '1000 Suburban Road, West Suburbs',
        sequence: 2,
        distanceFromStart: 8.5,
        estimatedArrivalTime: 622,  // 10:22
        estimatedDepartureTime: 624,  // 10:24
        coordinates: { latitude: 40.6950, longitude: -74.0600 }
      },
      {
        route: routes[3]._id,
        stopName: 'West Park',
        stopCode: 'WP-001',
        address: '1800 Park Lane, West Suburbs',
        sequence: 3,
        distanceFromStart: 16.2,
        estimatedArrivalTime: 642,  // 10:42
        estimatedDepartureTime: 644,  // 10:44
        coordinates: { latitude: 40.6850, longitude: -74.0750 }
      },
      {
        route: routes[3]._id,
        stopName: 'West Mall',
        stopCode: 'WM-001',
        address: '2500 Shopping Boulevard, West Suburbs',
        sequence: 4,
        distanceFromStart: 22.0,
        estimatedArrivalTime: 658,  // 10:58
        estimatedDepartureTime: 660,  // 11:00
        coordinates: { latitude: 40.6900, longitude: -74.0550 }
      },
      {
        route: routes[3]._id,
        stopName: 'West Station',
        stopCode: 'WS-001',
        address: '400 West Avenue, Westside',
        sequence: 5,
        distanceFromStart: 28.7,
        estimatedArrivalTime: 675,  // 11:15
        estimatedDepartureTime: 675,
        coordinates: { latitude: 40.7050, longitude: -74.0400 }
      }
    );

    // Stops for RT-005 (Old Highway Route - discontinued) - times in minutes from midnight
    routeStops.push(
      {
        route: routes[4]._id,
        stopName: 'South Terminal',
        stopCode: 'ST-001',
        address: '100 South Street, Southside',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 420,  // 07:00
        estimatedDepartureTime: 420,
        coordinates: { latitude: 40.6800, longitude: -74.0050 }
      },
      {
        route: routes[4]._id,
        stopName: 'Old Highway Stop',
        stopCode: 'OHS-001',
        address: 'Old Highway Mile 20',
        sequence: 2,
        distanceFromStart: 22.5,
        estimatedArrivalTime: 465,  // 07:45
        estimatedDepartureTime: 467,  // 07:47
        coordinates: { latitude: 40.7300, longitude: -74.0150 }
      },
      {
        route: routes[4]._id,
        stopName: 'North Terminal',
        stopCode: 'NT-002',
        address: '500 North Avenue, Northside',
        sequence: 3,
        distanceFromStart: 45.2,
        estimatedArrivalTime: 510,  // 08:30
        estimatedDepartureTime: 510,
        coordinates: { latitude: 40.7650, longitude: -74.0300 }
      }
    );

    await RouteStop.insertMany(routeStops);
    console.log('✓ Created sample route stops');

    // Update routes with stop references
    for (const route of routes) {
      const stops = await RouteStop.find({ route: route._id }).sort('sequence');
      route.stops = stops.map(s => s._id);
      await route.save();
    }
    console.log('✓ Updated routes with stop references');

    console.log('\n🎉 Route seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Routes created: ${routes.length}`);
    console.log(`   Active: ${routes.filter(r => r.status === 'active').length}`);
    console.log(`   Under Maintenance: ${routes.filter(r => r.status === 'under-maintenance').length}`);
    console.log(`   Discontinued: ${routes.filter(r => r.status === 'discontinued').length}`);
    console.log(`   Express routes: ${routes.filter(r => r.serviceType === 'express').length}`);
    console.log(`   Local routes: ${routes.filter(r => r.serviceType === 'local').length}`);
    console.log(`   Shuttle routes: ${routes.filter(r => r.serviceType === 'shuttle').length}`);
    console.log(`   Total stops created: ${routeStops.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Route seed error:', error);
    process.exit(1);
  }
};

// Run seeder
seedRoutes();
