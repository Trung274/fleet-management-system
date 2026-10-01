const Vehicle = require('../models/Vehicle.model');
const Driver = require('../models/Driver.model');
const Trip = require('../models/Trip.model');
const Seat = require('../models/Seat.model');
const Booking = require('../models/Booking.model');
require('../models/Route.model'); // populated below
const asyncHandler = require('../utils/asyncHandler');

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAYS = 7;
const TOP_ROUTES = 5;

const can = (user, resource, action = 'read') =>
  user.role?.name === 'admin' || user.hasPermission(resource, action);

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const pad = (n) => String(n).padStart(2, '0');
/** Local calendar day key, e.g. "2026-10-01" */
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ─── Sections (each only computed when the caller may see it) ────────

/** Today's trips by departure, with seat occupancy when the caller can read seats */
const tripsSection = async (todayStart, tomorrowStart, yesterdayStart, withSeats) => {
  const [todayTrips, yesterdayTotal] = await Promise.all([
    Trip.find({ scheduledDeparture: { $gte: todayStart, $lt: tomorrowStart } })
      .sort('scheduledDeparture')
      .populate('route', 'code name origin destination')
      .populate('vehicle', 'registrationNumber')
      .populate('driver', 'firstName lastName')
      .lean(),
    Trip.countDocuments({ scheduledDeparture: { $gte: yesterdayStart, $lt: todayStart } })
  ]);

  const counts = { total: todayTrips.length, scheduled: 0, inProgress: 0, delayed: 0, completed: 0, cancelled: 0 };
  const key = { scheduled: 'scheduled', 'in-progress': 'inProgress', delayed: 'delayed', completed: 'completed', cancelled: 'cancelled' };
  todayTrips.forEach(t => { counts[key[t.status]]++; });

  let seatsByTrip = new Map();
  if (withSeats && todayTrips.length) {
    const rows = await Seat.aggregate([
      { $match: { trip: { $in: todayTrips.map(t => t._id) } } },
      { $group: {
        _id: '$trip',
        total: { $sum: 1 },
        taken: { $sum: { $cond: [{ $in: ['$status', ['reserved', 'booked']] }, 1, 0] } }
      } }
    ]);
    seatsByTrip = new Map(rows.map(r => [String(r._id), { total: r.total, taken: r.taken }]));
  }

  return {
    today: counts,
    yesterdayTotal,
    schedule: todayTrips.map(t => ({
      _id: t._id,
      route: t.route,
      vehicle: t.vehicle,
      driver: t.driver,
      scheduledDeparture: t.scheduledDeparture,
      scheduledArrival: t.scheduledArrival,
      status: t.status,
      delayDuration: t.delayDuration,
      ...(withSeats && { seats: seatsByTrip.get(String(t._id)) || { total: 0, taken: 0 } })
    }))
  };
};

/** Seat occupancy of trips departing on a day (cancelled trips excluded) */
const occupancy = async (from, to) => {
  const trips = await Trip.find({ scheduledDeparture: { $gte: from, $lt: to }, status: { $ne: 'cancelled' } }).select('_id');
  if (!trips.length) return { total: 0, taken: 0 };
  const [row] = await Seat.aggregate([
    { $match: { trip: { $in: trips.map(t => t._id) } } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      taken: { $sum: { $cond: [{ $in: ['$status', ['reserved', 'booked']] }, 1, 0] } }
    } }
  ]);
  return row ? { total: row.total, taken: row.taken } : { total: 0, taken: 0 };
};

/**
 * Revenue = fares of CONFIRMED bookings, by booking date; pending bookings are reported separately.
 * Also a 7-day series and the busiest routes over the same 7 days.
 */
const revenueSection = async (todayStart, yesterdayStart, trendStart) => {
  const bookings = await Booking.find({ bookedAt: { $gte: trendStart }, status: { $ne: 'cancelled' } })
    .select('fare status bookedAt trip')
    .populate({ path: 'trip', select: 'route', populate: { path: 'route', select: 'code name' } })
    .lean();

  const days = new Map();
  for (let i = 0; i < TREND_DAYS; i++) {
    days.set(dayKey(new Date(trendStart.getTime() + i * DAY_MS)), { revenue: 0, pending: 0, tickets: 0 });
  }
  const routes = new Map();
  for (const b of bookings) {
    const day = days.get(dayKey(new Date(b.bookedAt)));
    if (day) {
      day.tickets++;
      if (b.status === 'confirmed') day.revenue += b.fare || 0;
      else day.pending += b.fare || 0;
    }
    const route = b.trip?.route;
    if (route) {
      const r = routes.get(String(route._id)) || { code: route.code, name: route.name, tickets: 0, revenue: 0 };
      r.tickets++;
      if (b.status === 'confirmed') r.revenue += b.fare || 0;
      routes.set(String(route._id), r);
    }
  }

  const today = days.get(dayKey(todayStart));
  const yesterday = days.get(dayKey(yesterdayStart));
  return {
    today: { confirmed: today.revenue, pending: today.pending, tickets: today.tickets },
    yesterday: { confirmed: yesterday.revenue, tickets: yesterday.tickets },
    last7Days: [...days.entries()].map(([date, d]) => ({ date, ...d })),
    topRoutes: [...routes.values()].sort((a, b) => b.tickets - a.tickets || b.revenue - a.revenue).slice(0, TOP_ROUTES)
  };
};

const countBy = async (Model, field) => {
  const rows = await Model.aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map(r => [r._id, r.n]));
};

const vehiclesSection = async () => {
  const c = await countBy(Vehicle, 'status');
  const inFleet = (c.active || 0) + (c.maintenance || 0) + (c['out-of-service'] || 0);
  return {
    total: inFleet, // retired vehicles are not part of the fleet
    active: c.active || 0,
    maintenance: c.maintenance || 0,
    outOfService: c['out-of-service'] || 0,
    retired: c.retired || 0
  };
};

const driversSection = async () => {
  const c = await countBy(Driver, 'employmentStatus');
  return {
    total: (c.active || 0) + (c['on-leave'] || 0) + (c.suspended || 0),
    active: c.active || 0,
    onLeave: c['on-leave'] || 0,
    suspended: c.suspended || 0
  };
};

// @desc    Dashboard summary — each section only for users allowed to read it
// @route   GET /api/v1/dashboard
// @access  Private
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const trendStart = new Date(todayStart.getTime() - (TREND_DAYS - 1) * DAY_MS);

  const u = req.user;
  const canTrips = can(u, 'trips');
  const canSeats = canTrips && can(u, 'seats');

  const [trips, seatsToday, seatsYesterday, revenue, vehicles, drivers] = await Promise.all([
    canTrips ? tripsSection(todayStart, tomorrowStart, yesterdayStart, canSeats) : null,
    canSeats ? occupancy(todayStart, tomorrowStart) : null,
    canSeats ? occupancy(yesterdayStart, todayStart) : null,
    can(u, 'bookings') ? revenueSection(todayStart, yesterdayStart, trendStart) : null,
    can(u, 'vehicles') ? vehiclesSection() : null,
    can(u, 'drivers') ? driversSection() : null
  ]);

  res.status(200).json({
    success: true,
    data: {
      generatedAt: now,
      ...(trips && { trips }),
      ...(canSeats && { seats: { today: seatsToday, yesterday: seatsYesterday } }),
      ...(revenue && { revenue }),
      ...(vehicles && { vehicles }),
      ...(drivers && { drivers })
    }
  });
});
