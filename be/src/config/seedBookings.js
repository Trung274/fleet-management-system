require('dotenv').config();
const mongoose = require('mongoose');
const Trip = require('../models/Trip.model');
const Seat = require('../models/Seat.model');
const Booking = require('../models/Booking.model');
const Itinerary = require('../models/Itinerary.model');
require('../models/Vehicle.model');
require('../models/Route.model');
const { seatTypesForCapacity } = require('../utils/seatLayout');

// Sample multi-trip itineraries, keyed by the route code of their second leg
const ITINERARY_SAMPLES = {
  'TB-ND-01': {
    passenger: { name: 'Vũ Thị Hoa', phone: '0906666666', email: 'thi.hoa@example.com' },
    status: 'confirmed'
  },
  'HP-HL-01': {
    passenger: { name: 'Đặng Quang Huy', phone: '0907777777', idNumber: '034567890123' },
    status: 'pending'
  }
};

// Connect to database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const seedBookings = async () => {
  try {
    console.log('🌱 Starting bookings seed...');

    // Clear existing data (itineraries reference bookings, so clear them too)
    await Itinerary.deleteMany({});
    await Booking.deleteMany({});
    await Seat.deleteMany({});
    console.log('✓ Cleared existing itineraries, seats and bookings');

    // Every trip that is still to run (or running) gets a seat map
    const bookableTrips = await Trip.find({ status: { $in: ['scheduled', 'delayed', 'in-progress'] } })
      .populate('vehicle')
      .populate('route')
      .sort('scheduledDeparture');

    if (bookableTrips.length === 0) {
      console.log('⚠️  No scheduled trips found. Run npm run seed:trips first.');
      process.exit(0);
    }

    console.log(`✓ Found ${bookableTrips.length} trip(s) to seed seats for`);

    // Single-trip sample bookings go on the 2 earliest scheduled trips
    const trips = bookableTrips.filter(t => t.status === 'scheduled').slice(0, 2);

    const allSeats = [];

    for (const trip of bookableTrips) {
      const capacity = trip.vehicle.capacity;
      const types = seatTypesForCapacity(capacity);
      const seats = [];
      for (let i = 1; i <= capacity; i++) {
        seats.push({
          trip: trip._id,
          vehicle: trip.vehicle._id,
          seatNumber: i,
          type: types[i - 1],
          status: 'available'
        });
      }
      const created = await Seat.insertMany(seats);
      allSeats.push(...created);
      console.log(`  ✓ Initialized ${created.length} seats for trip ${trip._id}`);
    }

    // Create sample bookings across trips
    const bookingsData = [];

    // Trip 1 bookings
    if (trips[0] && allSeats.length >= 5) {
      const trip1Seats = allSeats.filter(s => String(s.trip) === String(trips[0]._id));

      // Booking 1: confirmed booking
      bookingsData.push({
        trip: trips[0]._id,
        seat: trip1Seats[0]._id,
        passenger: {
          name: 'Nguyễn Văn An',
          phone: '0901111111',
          email: 'van.an@example.com',
          idNumber: '012345678901'
        },
        fare: trips[0].fare || 150000,
        status: 'confirmed',
        bookedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        confirmedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      });

      // Booking 2: pending booking
      bookingsData.push({
        trip: trips[0]._id,
        seat: trip1Seats[1]._id,
        passenger: {
          name: 'Trần Thị Bích',
          phone: '0902222222',
          email: 'thi.bich@example.com'
        },
        fare: trips[0].fare || 150000,
        status: 'pending',
        bookedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      });

      // Booking 3: cancelled booking
      bookingsData.push({
        trip: trips[0]._id,
        seat: trip1Seats[2]._id,
        passenger: {
          name: 'Lê Văn Cường',
          phone: '0903333333'
        },
        fare: trips[0].fare || 150000,
        status: 'cancelled',
        bookedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        cancelledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        cancellationReason: 'Hành khách thay đổi lịch trình'
      });

      // Update seat statuses to match bookings
      await Seat.findByIdAndUpdate(trip1Seats[0]._id, { status: 'booked' });
      await Seat.findByIdAndUpdate(trip1Seats[1]._id, { status: 'reserved' });
      // trip1Seats[2] stays available (cancelled booking releases it)
    }

    // Trip 2 bookings
    if (trips[1] && allSeats.length >= 10) {
      const trip2Seats = allSeats.filter(s => String(s.trip) === String(trips[1]._id));

      if (trip2Seats.length >= 2) {
        // Booking 4: confirmed booking on trip 2
        bookingsData.push({
          trip: trips[1]._id,
          seat: trip2Seats[0]._id,
          passenger: {
            name: 'Phạm Thị Dung',
            phone: '0904444444',
            email: 'thi.dung@example.com',
            idNumber: '098765432109'
          },
          fare: trips[1].fare || 120000,
          status: 'confirmed',
          bookedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          confirmedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        });

        // Booking 5: pending booking on trip 2
        bookingsData.push({
          trip: trips[1]._id,
          seat: trip2Seats[1]._id,
          passenger: {
            name: 'Hoàng Minh Em',
            phone: '0905555555'
          },
          fare: trips[1].fare || 120000,
          status: 'pending',
          bookedAt: new Date()
        });

        await Seat.findByIdAndUpdate(trip2Seats[0]._id, { status: 'booked' });
        await Seat.findByIdAndUpdate(trip2Seats[1]._id, { status: 'reserved' });
      }
    }

    const createdBookings = await Booking.insertMany(bookingsData);
    console.log(`✓ Created ${createdBookings.length} sample bookings`);

    // ─── Multi-trip itineraries ────────────────────────────────────
    // For each second leg, the first leg is the latest trip arriving at its origin before it departs
    const createdItineraries = [];
    for (const leg2 of bookableTrips) {
      const sample = ITINERARY_SAMPLES[leg2.route.code];
      if (!sample) continue;

      const leg1 = bookableTrips
        .filter(t =>
          t.route.destination === leg2.route.origin &&
          t.scheduledArrival <= leg2.scheduledDeparture
        )
        .sort((a, b) => b.scheduledArrival - a.scheduledArrival)[0];
      if (!leg1) {
        console.log(`⚠️  No connecting first leg found for ${leg2.route.code} — skipped`);
        continue;
      }

      const itineraryId = new mongoose.Types.ObjectId();
      const bookedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const seatStatus = sample.status === 'confirmed' ? 'booked' : 'reserved';
      const legBookings = [];

      for (const trip of [leg1, leg2]) {
        // Seat 5: clear of the priority seats and the single-trip bookings above
        const seat = allSeats.find(s => String(s.trip) === String(trip._id) && s.seatNumber === 5);
        legBookings.push({
          trip: trip._id,
          seat: seat._id,
          itinerary: itineraryId,
          passenger: sample.passenger,
          fare: trip.fare,
          status: sample.status,
          bookedAt,
          ...(sample.status === 'confirmed' && { confirmedAt: new Date() })
        });
        await Seat.findByIdAndUpdate(seat._id, { status: seatStatus });
      }

      const legs = await Booking.insertMany(legBookings);
      const itinerary = await Itinerary.create({
        _id: itineraryId,
        passenger: sample.passenger,
        legs: legs.map(l => l._id),
        status: sample.status,
        totalFare: legs.reduce((sum, l) => sum + (l.fare || 0), 0),
        ...(sample.status === 'confirmed' && { confirmedAt: new Date() })
      });
      createdItineraries.push(itinerary);
      console.log(`  ✓ Itinerary ${leg1.route.origin} → ${leg1.route.destination} → ${leg2.route.destination} (${sample.status})`);
    }
    console.log(`✓ Created ${createdItineraries.length} sample itineraries`);

    // ─── Bulk bookings so the dashboard has realistic numbers ──────
    // 35–75% of each trip's free seats, booked over the last 6 days; mostly confirmed.
    // Fixed-seed random so every seed run gives the same data.
    let rngState = 20261001;
    const rand = () => (rngState = (rngState * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô'];
    const MIDDLE = ['Văn', 'Thị', 'Minh', 'Đức', 'Thu', 'Quang', 'Ngọc', 'Hải'];
    const GIVEN = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Khánh', 'Linh', 'Nam', 'Phương', 'Quân', 'Thảo', 'Tuấn', 'Yến'];

    const usedSeatIds = new Set([
      ...bookingsData.map(b => String(b.seat)),
      ...(await Booking.find({ itinerary: { $ne: null } }).select('seat')).map(b => String(b.seat))
    ]);
    const bulk = [];
    const seatUpdates = [];
    const now = Date.now();
    for (const trip of bookableTrips) {
      const free = allSeats.filter(s => String(s.trip) === String(trip._id) && !usedSeatIds.has(String(s._id)));
      const count = Math.floor(free.length * (0.35 + rand() * 0.4));
      const chosen = [...free].sort(() => rand() - 0.5).slice(0, count);
      for (const seat of chosen) {
        const roll = rand();
        const status = roll < 0.75 ? 'confirmed' : roll < 0.95 ? 'pending' : 'cancelled';
        // Booked sometime in the last 6 days, never after departure
        const bookedAt = new Date(Math.min(now - rand() * 6 * 24 * 60 * 60 * 1000, trip.scheduledDeparture.getTime() - 60 * 60 * 1000));
        bulk.push({
          trip: trip._id,
          seat: seat._id,
          passenger: {
            name: `${pick(FAMILY)} ${pick(MIDDLE)} ${pick(GIVEN)}`,
            phone: `09${String(Math.floor(rand() * 1e8)).padStart(8, '0')}`
          },
          fare: trip.fare,
          status,
          bookedAt,
          ...(status === 'confirmed' && { confirmedAt: new Date(bookedAt.getTime() + 30 * 60 * 1000) }),
          ...(status === 'cancelled' && { cancelledAt: new Date(bookedAt.getTime() + 60 * 60 * 1000), cancellationReason: 'Hành khách đổi kế hoạch' })
        });
        if (status !== 'cancelled') {
          seatUpdates.push({ updateOne: { filter: { _id: seat._id }, update: { status: status === 'confirmed' ? 'booked' : 'reserved' } } });
        }
      }
    }
    await Booking.insertMany(bulk);
    if (seatUpdates.length) await Seat.bulkWrite(seatUpdates);
    console.log(`✓ Created ${bulk.length} extra bookings over the last 6 days`);

    console.log('\n🎉 Bookings seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Trips with seats: ${bookableTrips.length}`);
    console.log(`   Total seats created: ${allSeats.length}`);
    console.log(`   Single-trip bookings: ${createdBookings.length} (2 confirmed, 2 pending, 1 cancelled)`);
    console.log(`   Itineraries: ${createdItineraries.length} (each with 2 leg bookings)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedBookings();
