const Vehicle = require('../models/Vehicle.model');
const Driver = require('../models/Driver.model');
const Trip = require('../models/Trip.model');
const Booking = require('../models/Booking.model');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard summary statistics
// @route   GET /api/v1/dashboard
// @access  Private
exports.getDashboardStats = asyncHandler(async (req, res) => {
  // ─── Date helpers ───────────────────────────────────────────────────
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // ─── Run all aggregations in parallel ───────────────────────────────
  const [
    totalVehicles,
    activeVehicles,
    maintenanceVehicles,
    totalDrivers,
    activeDrivers,
    totalTripsToday,
    tripsInProgress,
    totalBookingsToday,
    confirmedBookingsToday,
    recentTrips,
  ] = await Promise.all([
    // Vehicles
    Vehicle.countDocuments(),
    Vehicle.countDocuments({ status: 'active' }),
    Vehicle.countDocuments({ status: 'maintenance' }),

    // Drivers
    Driver.countDocuments(),
    Driver.countDocuments({ employmentStatus: 'active' }),

    // Trips today (by scheduled departure)
    Trip.countDocuments({
      scheduledDeparture: { $gte: todayStart, $lte: todayEnd },
    }),
    Trip.countDocuments({ status: 'in-progress' }),

    // Bookings today
    Booking.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    }),
    Booking.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: 'confirmed',
    }),

    // Recent trips (last 5)
    Trip.find()
      .sort({ scheduledDeparture: -1 })
      .limit(5)
      .populate('route', 'name origin destination')
      .populate('vehicle', 'registrationNumber make model')
      .populate('driver', 'firstName lastName'),
  ]);

  res.status(200).json({
    success: true,
    data: {
      vehicles: {
        total: totalVehicles,
        active: activeVehicles,
        maintenance: maintenanceVehicles,
        outOfService: totalVehicles - activeVehicles - maintenanceVehicles,
      },
      drivers: {
        total: totalDrivers,
        active: activeDrivers,
        inactive: totalDrivers - activeDrivers,
      },
      tripsToday: {
        total: totalTripsToday,
        inProgress: tripsInProgress,
      },
      bookingsToday: {
        total: totalBookingsToday,
        confirmed: confirmedBookingsToday,
      },
      recentTrips,
    },
  });
});
