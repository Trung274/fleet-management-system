require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Trip = require('../models/Trip.model');
const Seat = require('../models/Seat.model');
const Booking = require('../models/Booking.model');

connectDB();

const seedBookings = async () => {
  try {
    console.log('🌱 Starting bookings seed...');

    // Clear existing data
    await Booking.deleteMany({});
    await Seat.deleteMany({});
    console.log('✓ Cleared existing seats and bookings');

    // Find first 2 scheduled trips with populated vehicles
    const trips = await Trip.find({ status: 'scheduled' }).populate('vehicle').limit(2);

    if (trips.length === 0) {
      console.log('⚠️  No scheduled trips found. Run npm run seed:trips first.');
      process.exit(0);
    }

    console.log(`✓ Found ${trips.length} trip(s) to seed seats for`);

    const allSeats = [];

    for (const trip of trips) {
      const capacity = trip.vehicle.capacity;
      const seats = [];
      for (let i = 1; i <= capacity; i++) {
        seats.push({
          trip: trip._id,
          vehicle: trip.vehicle._id,
          seatNumber: i,
          type: i <= 2 ? 'priority' : i % 5 === 0 ? 'window' : 'standard',
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
          name: 'Nguyen Van An',
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
          name: 'Tran Thi Bich',
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
          name: 'Le Van Cuong',
          phone: '0903333333'
        },
        fare: trips[0].fare || 150000,
        status: 'cancelled',
        bookedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        cancelledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        cancellationReason: 'Passenger changed travel plans'
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
            name: 'Pham Thi Dung',
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
            name: 'Hoang Minh Em',
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

    console.log('\n🎉 Bookings seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Trips seeded: ${trips.length}`);
    console.log(`   Total seats created: ${allSeats.length}`);
    console.log(`   Bookings created: ${createdBookings.length}`);
    console.log('   Status breakdown: 2 confirmed, 2 pending, 1 cancelled');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedBookings();
