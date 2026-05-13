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
        name: 'Hà Nội - Hải Phòng (Cao tốc)',
        code: 'HN-HP-01',
        description: 'Tuyến xe khách chạy thẳng cao tốc Hà Nội - Hải Phòng',
        origin: 'Bến xe Gia Lâm',
        destination: 'Bến xe Niệm Nghĩa',
        distance: 120.5,
        status: 'active',
        serviceType: 'express',
        estimatedDuration: 90
      },
      {
        name: 'Hà Nội - Thái Bình (Quốc lộ 10)',
        code: 'HN-TB-01',
        description: 'Tuyến xe khách chạy theo tuyến Quốc lộ 10, đỗ nhiều điểm',
        origin: 'Bến xe Giáp Bát',
        destination: 'Bến xe Thái Bình',
        distance: 110.3,
        status: 'active',
        serviceType: 'local',
        estimatedDuration: 180
      },
      {
        name: 'Hà Nội - Sân bay Nội Bài',
        code: 'HN-NB-01',
        description: 'Tuyến xe bus trung chuyển sân bay trực tiếp',
        origin: 'Ga Hà Nội',
        destination: 'Sân bay Quốc tế Nội Bài',
        distance: 30.0,
        status: 'active',
        serviceType: 'shuttle',
        estimatedDuration: 45
      },
      {
        name: 'Hà Nội - Sa Pa (Giường nằm)',
        code: 'HN-SP-01',
        description: 'Tuyến du lịch giường nằm chất lượng cao',
        origin: 'Bến xe Mỹ Đình',
        destination: 'Bến xe Sa Pa',
        distance: 315.7,
        status: 'under-maintenance',
        serviceType: 'local',
        estimatedDuration: 360
      },
      {
        name: 'Hà Nội - Hải Phòng (QL5 cũ)',
        code: 'HN-HP-02',
        description: 'Tuyến xe khách qua QL5 cũ, đã ngừng hoạt động',
        origin: 'Bến xe Gia Lâm',
        destination: 'Bến xe Tam Bạc',
        distance: 105.2,
        status: 'discontinued',
        serviceType: 'express',
        estimatedDuration: 150,
        discontinuedDate: new Date('2025-12-31')
      }
    ]);

    console.log('✓ Created sample routes');

    // Create route stops for each route
    const routeStops = [];

    // Stops for HN-HP-01 (Hà Nội - Hải Phòng Cao tốc)
    routeStops.push(
      {
        route: routes[0]._id,
        stopName: 'Bến xe Gia Lâm',
        stopCode: 'GL-01',
        address: 'Số 9 Ngô Gia Khảm, Ngọc Lâm, Long Biên, Hà Nội',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 480,  // 08:00
        estimatedDepartureTime: 480,
        coordinates: { latitude: 21.0475, longitude: 105.8770 }
      },
      {
        route: routes[0]._id,
        stopName: 'Nút giao Vành đai 3',
        stopCode: 'VD3-01',
        address: 'Đường dẫn cao tốc Hà Nội - Hải Phòng',
        sequence: 2,
        distanceFromStart: 8.5,
        estimatedArrivalTime: 500,  // 08:20
        estimatedDepartureTime: 502,
        coordinates: { latitude: 21.0180, longitude: 105.9220 }
      },
      {
        route: routes[0]._id,
        stopName: 'Trạm dừng nghỉ V52 Hải Dương',
        stopCode: 'V52-01',
        address: 'Km52 Cao tốc Hà Nội - Hải Phòng, Gia Lộc, Hải Dương',
        sequence: 3,
        distanceFromStart: 52.0,
        estimatedArrivalTime: 540,  // 09:00
        estimatedDepartureTime: 550,  // 09:10
        coordinates: { latitude: 20.8400, longitude: 106.3100 }
      },
      {
        route: routes[0]._id,
        stopName: 'Bến xe Niệm Nghĩa',
        stopCode: 'NN-01',
        address: '275 Trần Nguyên Hãn, Niệm Nghĩa, Lê Chân, Hải Phòng',
        sequence: 4,
        distanceFromStart: 120.5,
        estimatedArrivalTime: 590,  // 09:50
        estimatedDepartureTime: 590,
        coordinates: { latitude: 20.8520, longitude: 106.6710 }
      }
    );

    // Stops for HN-TB-01 (Hà Nội - Thái Bình QL10)
    routeStops.push(
      {
        route: routes[1]._id,
        stopName: 'Bến xe Giáp Bát',
        stopCode: 'GB-01',
        address: 'Km6 Đường Giải Phóng, Giáp Bát, Hoàng Mai, Hà Nội',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 540,  // 09:00
        estimatedDepartureTime: 540,
        coordinates: { latitude: 20.9850, longitude: 105.8420 }
      },
      {
        route: routes[1]._id,
        stopName: 'Phủ Lý',
        stopCode: 'PL-01',
        address: 'Quốc lộ 1A, Phủ Lý, Hà Nam',
        sequence: 2,
        distanceFromStart: 60.5,
        estimatedArrivalTime: 615,  // 10:15
        estimatedDepartureTime: 620,
        coordinates: { latitude: 20.5450, longitude: 105.9120 }
      },
      {
        route: routes[1]._id,
        stopName: 'Nam Định',
        stopCode: 'ND-01',
        address: 'Quốc lộ 10, Lộc Hòa, Nam Định',
        sequence: 3,
        distanceFromStart: 90.0,
        estimatedArrivalTime: 660,  // 11:00
        estimatedDepartureTime: 665,
        coordinates: { latitude: 20.4350, longitude: 106.1600 }
      },
      {
        route: routes[1]._id,
        stopName: 'Bến xe Thái Bình',
        stopCode: 'TB-01',
        address: 'Đường Tỉnh 39A, Hoàng Diệu, Thái Bình',
        sequence: 4,
        distanceFromStart: 110.3,
        estimatedArrivalTime: 720,  // 12:00
        estimatedDepartureTime: 720,
        coordinates: { latitude: 20.4500, longitude: 106.3350 }
      }
    );

    // Stops for HN-NB-01 (Hà Nội - Sân bay Nội Bài)
    routeStops.push(
      {
        route: routes[2]._id,
        stopName: 'Ga Hà Nội',
        stopCode: 'GHN-01',
        address: '120 Lê Duẩn, Hoàn Kiếm, Hà Nội',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 360,  // 06:00
        estimatedDepartureTime: 360,
        coordinates: { latitude: 21.0250, longitude: 105.8400 }
      },
      {
        route: routes[2]._id,
        stopName: 'Điểm trung chuyển Cầu Giấy',
        stopCode: 'CG-01',
        address: 'Đường Cầu Giấy, Ngọc Khánh, Ba Đình, Hà Nội',
        sequence: 2,
        distanceFromStart: 7.5,
        estimatedArrivalTime: 380,  // 06:20
        estimatedDepartureTime: 382,
        coordinates: { latitude: 21.0300, longitude: 105.8050 }
      },
      {
        route: routes[2]._id,
        stopName: 'Sân bay Quốc tế Nội Bài',
        stopCode: 'NBA-01',
        address: 'Phú Minh, Sóc Sơn, Hà Nội',
        sequence: 3,
        distanceFromStart: 30.0,
        estimatedArrivalTime: 405,  // 06:45
        estimatedDepartureTime: 405,
        coordinates: { latitude: 21.2180, longitude: 105.8040 }
      }
    );

    // Stops for HN-SP-01 (Hà Nội - Sa Pa)
    routeStops.push(
      {
        route: routes[3]._id,
        stopName: 'Bến xe Mỹ Đình',
        stopCode: 'MD-01',
        address: '20 Phạm Hùng, Mỹ Đình, Nam Từ Liêm, Hà Nội',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 1200,  // 20:00
        estimatedDepartureTime: 1200,
        coordinates: { latitude: 21.0280, longitude: 105.7780 }
      },
      {
        route: routes[3]._id,
        stopName: 'Nút giao IC4 (Nội Bài)',
        stopCode: 'IC4-01',
        address: 'Đường cao tốc Nội Bài - Lào Cai',
        sequence: 2,
        distanceFromStart: 25.5,
        estimatedArrivalTime: 1230,  // 20:30
        estimatedDepartureTime: 1235,
        coordinates: { latitude: 21.2150, longitude: 105.8150 }
      },
      {
        route: routes[3]._id,
        stopName: 'Trạm dừng nghỉ Km57',
        stopCode: 'KM57-01',
        address: 'Km57 Cao tốc Nội Bài - Lào Cai, Phú Thọ',
        sequence: 3,
        distanceFromStart: 82.0,
        estimatedArrivalTime: 1300,  // 21:40
        estimatedDepartureTime: 1320,  // 22:00
        coordinates: { latitude: 21.4350, longitude: 105.2150 }
      },
      {
        route: routes[3]._id,
        stopName: 'Trạm dừng nghỉ Km237',
        stopCode: 'KM237-01',
        address: 'Km237 Cao tốc Nội Bài - Lào Cai, Bảo Thắng, Lào Cai',
        sequence: 4,
        distanceFromStart: 262.0,
        estimatedArrivalTime: 1500,  // 01:00 (next day)
        estimatedDepartureTime: 1515,
        coordinates: { latitude: 22.3850, longitude: 104.0500 }
      },
      {
        route: routes[3]._id,
        stopName: 'Bến xe Sa Pa',
        stopCode: 'SP-01',
        address: 'Thị xã Sa Pa, Lào Cai',
        sequence: 5,
        distanceFromStart: 315.7,
        estimatedArrivalTime: 1560,  // 02:00 (next day)
        estimatedDepartureTime: 1560,
        coordinates: { latitude: 22.3350, longitude: 103.8420 }
      }
    );

    // Stops for HN-HP-02 (Hà Nội - Hải Phòng QL5 cũ)
    routeStops.push(
      {
        route: routes[4]._id,
        stopName: 'Bến xe Gia Lâm',
        stopCode: 'GL-02',
        address: 'Số 9 Ngô Gia Khảm, Ngọc Lâm, Long Biên, Hà Nội',
        sequence: 1,
        distanceFromStart: 0,
        estimatedArrivalTime: 420,  // 07:00
        estimatedDepartureTime: 420,
        coordinates: { latitude: 21.0475, longitude: 105.8770 }
      },
      {
        route: routes[4]._id,
        stopName: 'Ngã tư Phố Nối',
        stopCode: 'PN-01',
        address: 'Quốc lộ 5, Mỹ Hào, Hưng Yên',
        sequence: 2,
        distanceFromStart: 30.0,
        estimatedArrivalTime: 465,  // 07:45
        estimatedDepartureTime: 470,
        coordinates: { latitude: 20.9300, longitude: 106.0500 }
      },
      {
        route: routes[4]._id,
        stopName: 'Bến xe Tam Bạc',
        stopCode: 'TB-02',
        address: 'Tam Bạc, Lê Chân, Hải Phòng (Đã dỡ bỏ)',
        sequence: 3,
        distanceFromStart: 105.2,
        estimatedArrivalTime: 570,  // 09:30
        estimatedDepartureTime: 570,
        coordinates: { latitude: 20.8550, longitude: 106.6750 }
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
