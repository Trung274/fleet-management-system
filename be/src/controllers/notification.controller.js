const Vehicle = require('../models/Vehicle.model');
const Driver = require('../models/Driver.model');
const Trip = require('../models/Trip.model');
const Itinerary = require('../models/Itinerary.model');
const MaintenanceRecord = require('../models/MaintenanceRecord.model');
require('../models/Route.model'); // populated below
const asyncHandler = require('../utils/asyncHandler');
const { endOfDay } = require('../utils/schedule');
const { describeConnection } = require('./itinerary.controller');

// Alert windows
const INSPECTION_WARN_DAYS = 30;
const LICENSE_WARN_DAYS = 30;
const MAINTENANCE_WARN_DAYS = 7;
const MAINTENANCE_SOON_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Whole calendar days from today to `date` (negative = in the past) */
const daysFromToday = (date, now) => Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
const viDate = (d) => d.toLocaleDateString('vi-VN');
const pad = (n) => String(n).padStart(2, '0');
/** "03/10 08:00" */
const viDateTime = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

const can = (user, resource, action) => user.role?.name === 'admin' || user.hasPermission(resource, action);

/**
 * Expiry alert for something valid through the end of `expiry`.
 * The id includes the severity, so "expiring" → "expired" shows up as a new (unread) alert.
 */
const expiryAlert = ({ key, expiry, now, warnDays, label, what, link, category }) => {
  if (!expiry) return null;
  const validUntil = endOfDay(expiry);
  const days = daysFromToday(validUntil, now);
  if (days > warnDays) return null;
  const expired = validUntil < now;
  return {
    id: `${key}:${validUntil.toISOString().slice(0, 10)}:${expired ? 'expired' : 'expiring'}`,
    severity: expired ? 'error' : 'warning',
    category,
    title: expired ? `${what} đã hết hạn` : `${what} sắp hết hạn`,
    message: expired
      ? `${label}: ${what.toLowerCase()} hết hạn từ ${viDate(validUntil)}`
      : `${label}: ${what.toLowerCase()} hết hạn ${days === 0 ? 'hôm nay' : `sau ${days} ngày`} (${viDate(validUntil)})`,
    link,
    date: validUntil
  };
};

const vehicleAlerts = async (now) => {
  const [vehicles, plannedPeriodic] = await Promise.all([
    Vehicle.find({ status: { $ne: 'retired' } }),
    // A periodic maintenance already planned answers the "due soon" alert
    MaintenanceRecord.distinct('vehicle', { type: 'periodic', status: { $in: ['scheduled', 'in-progress'] } })
  ]);
  const planned = new Set(plannedPeriodic.map(String));
  const alerts = [];

  for (const v of vehicles) {
    const label = `Xe ${v.registrationNumber}`;
    alerts.push(expiryAlert({
      key: `inspection:${v._id}`, expiry: v.inspectionExpiry, now, warnDays: INSPECTION_WARN_DAYS,
      label, what: 'Đăng kiểm', link: '/vehicles', category: 'vehicle'
    }));

    const due = v.nextMaintenanceDue;
    if (due && !planned.has(String(v._id))) {
      const days = daysFromToday(due, now);
      if (days <= MAINTENANCE_WARN_DAYS) {
        const overdue = days < 0;
        alerts.push({
          id: `maintenance-due:${v._id}:${due.toISOString().slice(0, 10)}:${overdue ? 'overdue' : 'due'}`,
          severity: overdue ? 'error' : 'warning',
          category: 'vehicle',
          title: overdue ? 'Quá hạn bảo dưỡng' : 'Sắp đến hạn bảo dưỡng',
          message: overdue
            ? `${label} quá hạn bảo dưỡng định kỳ ${-days} ngày (từ ${viDate(due)})`
            : `${label} đến hạn bảo dưỡng ${days === 0 ? 'hôm nay' : `sau ${days} ngày`} (${viDate(due)})`,
          link: '/maintenance',
          date: due
        });
      }
    }
  }
  return alerts.filter(Boolean);
};

const maintenanceAlerts = async (now) => {
  const soon = new Date(now.getTime() + MAINTENANCE_SOON_DAYS * DAY_MS);
  const [upcoming, overrunning] = await Promise.all([
    MaintenanceRecord.find({ status: 'scheduled', scheduledStart: { $gte: now, $lte: soon } })
      .populate('vehicle', 'registrationNumber'),
    MaintenanceRecord.find({ status: 'in-progress', scheduledEnd: { $lt: now } })
      .populate('vehicle', 'registrationNumber')
  ]);
  return [
    ...upcoming.map(m => ({
      id: `maintenance-soon:${m._id}:${m.scheduledStart.toISOString()}`,
      severity: 'info',
      category: 'maintenance',
      title: 'Lịch bảo dưỡng sắp tới',
      message: `Xe ${m.vehicle?.registrationNumber} vào xưởng lúc ${viDateTime(m.scheduledStart)} — không xếp chuyến trong thời gian này`,
      link: '/maintenance',
      date: m.scheduledStart
    })),
    ...overrunning.map(m => ({
      id: `maintenance-overrun:${m._id}`,
      severity: 'warning',
      category: 'maintenance',
      title: 'Bảo dưỡng quá thời gian dự kiến',
      message: `Xe ${m.vehicle?.registrationNumber} dự kiến xong lúc ${viDateTime(m.scheduledEnd)} nhưng chưa hoàn thành`,
      link: '/maintenance',
      date: m.scheduledEnd
    }))
  ];
};

const driverAlerts = async (now) => {
  const drivers = await Driver.find({ employmentStatus: 'active' });
  return drivers.map(d => expiryAlert({
    key: `license:${d._id}`, expiry: d.licenseExpiry, now, warnDays: LICENSE_WARN_DAYS,
    label: `Tài xế ${d.firstName} ${d.lastName}`, what: 'Bằng lái', link: '/drivers', category: 'driver'
  })).filter(Boolean);
};

/** Upcoming trips that can no longer run as planned (scheduled before the problem appeared) */
const tripAlerts = async (now) => {
  const trips = await Trip.find({ status: { $in: ['scheduled', 'delayed'] }, scheduledArrival: { $gte: now } })
    .populate('route', 'code')
    .populate('driver', 'firstName lastName licenseExpiry')
    .populate('vehicle', 'registrationNumber inspectionExpiry');
  const alerts = [];
  for (const t of trips) {
    const label = `Chuyến ${t.route?.code ?? ''} lúc ${viDateTime(t.scheduledDeparture)}`;
    if (t.driver?.licenseExpiry && endOfDay(t.driver.licenseExpiry) < t.scheduledArrival) {
      alerts.push({
        id: `trip-license:${t._id}`,
        severity: 'error',
        category: 'trip',
        title: 'Chuyến cần đổi tài xế',
        message: `${label}: bằng lái của ${t.driver.firstName} ${t.driver.lastName} hết hạn trước khi chuyến kết thúc`,
        link: '/trips',
        date: t.scheduledDeparture
      });
    }
    if (t.vehicle?.inspectionExpiry && endOfDay(t.vehicle.inspectionExpiry) < t.scheduledArrival) {
      alerts.push({
        id: `trip-inspection:${t._id}`,
        severity: 'error',
        category: 'trip',
        title: 'Chuyến cần đổi xe',
        message: `${label}: xe ${t.vehicle.registrationNumber} hết hạn đăng kiểm trước khi chuyến kết thúc`,
        link: '/trips',
        date: t.scheduledDeparture
      });
    }
  }
  return alerts;
};

const itineraryAlerts = async (now) => {
  const itineraries = await Itinerary.find({ status: { $in: ['pending', 'confirmed'] } })
    .populate({ path: 'legs', populate: { path: 'trip', populate: { path: 'route', select: 'code origin destination' } } });
  const alerts = [];
  for (const it of itineraries) {
    const trips = it.legs.map(l => l.trip).filter(Boolean);
    // Only journeys that are not over yet
    if (trips.length < 2 || trips[trips.length - 1].scheduledArrival < now) continue;
    for (let i = 0; i < trips.length - 1; i++) {
      const c = describeConnection(trips[i], trips[i + 1]);
      if (!c.ok) {
        alerts.push({
          id: `itinerary-risk:${it._id}:${i}:${c.transferMinutes}`,
          severity: 'warning',
          category: 'itinerary',
          title: 'Hành trình có thể lỡ nối chuyến',
          message: `${it.passenger.name}: chuyển xe tại ${c.transferAt} chỉ còn ${c.transferMinutes} phút (chặng ${i + 1} → ${i + 2})`,
          link: '/itineraries',
          date: trips[i + 1].scheduledDeparture
        });
      }
    }
  }
  return alerts;
};

// @desc    Alerts for the header bell, computed on request and filtered by the
//          caller's permissions (nothing is stored)
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res) => {
  const now = new Date();
  const u = req.user;
  const groups = await Promise.all([
    can(u, 'vehicles', 'read') ? vehicleAlerts(now) : [],
    can(u, 'maintenance', 'read') ? maintenanceAlerts(now) : [],
    can(u, 'drivers', 'read') ? driverAlerts(now) : [],
    can(u, 'trips', 'read') ? tripAlerts(now) : [],
    can(u, 'bookings', 'read') ? itineraryAlerts(now) : []
  ]);

  const data = groups.flat().sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.date - b.date
  );

  res.status(200).json({ success: true, count: data.length, data });
});
