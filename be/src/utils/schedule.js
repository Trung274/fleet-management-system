// Scheduling helpers shared by trips, maintenance and notifications
const Trip = require('../models/Trip.model');
const MaintenanceRecord = require('../models/MaintenanceRecord.model');
require('../models/Route.model'); // populated below

/**
 * End of the calendar day stored in `date`.
 * Expiry dates are saved as UTC midnight of the chosen day (the frontend sends YYYY-MM-DD),
 * so take the UTC date parts and end that day in server local time (set TZ on the host).
 */
const endOfDay = (date) => {
  const d = new Date(date);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999);
};

const formatDate = (date) => date.toLocaleDateString('en-GB'); // DD/MM/YYYY
const formatDateTime = (date) => date.toLocaleString('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

/** Trips of a vehicle that are still to run (or running) and overlap [start, end) */
const findConflictingTrips = (vehicleId, start, end, { excludeTripId } = {}) => {
  const query = {
    vehicle: vehicleId,
    status: { $in: ['scheduled', 'delayed', 'in-progress'] },
    scheduledDeparture: { $lt: end },
    scheduledArrival: { $gt: start }
  };
  if (excludeTripId) query._id = { $ne: excludeTripId };
  return Trip.find(query)
    .populate('route', 'code origin destination')
    .sort('scheduledDeparture');
};

/** Scheduled / ongoing maintenance of a vehicle overlapping [start, end) */
const findConflictingMaintenance = (vehicleId, start, end, { excludeId } = {}) => {
  const query = {
    vehicle: vehicleId,
    status: { $in: ['scheduled', 'in-progress'] },
    scheduledStart: { $lt: end },
    scheduledEnd: { $gt: start }
  };
  if (excludeId) query._id = { $ne: excludeId };
  return MaintenanceRecord.find(query).sort('scheduledStart');
};

module.exports = { endOfDay, formatDate, formatDateTime, findConflictingTrips, findConflictingMaintenance };
