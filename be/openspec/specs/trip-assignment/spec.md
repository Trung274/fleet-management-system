# Trip Assignment Specification

## Overview
Assign vehicles and drivers to routes for specific time slots with comprehensive availability validation to prevent resource conflicts.

## Functional Requirements

### FR-1: Vehicle Assignment
**Description:** Assign a vehicle to a trip with availability validation.

**Inputs:**
- Trip ID (required)
- Vehicle ID (required)
- Scheduled departure time (required)
- Scheduled arrival time (required)

**Validation:**
- Vehicle must exist
- Vehicle status must be 'active' (not maintenance, retired, out-of-service)
- Vehicle must not have overlapping trips in the time range
- Time range must be valid (arrival after departure)

**Outputs:**
- Success: Vehicle assigned to trip
- Failure: 400 Bad Request (unavailable, invalid status), 404 Not Found

**Business Rules:**
- A vehicle can only be assigned to one trip at a time
- Overlapping trips are detected by checking:
  - New trip starts during existing trip
  - New trip ends during existing trip
  - New trip completely contains existing trip
  - Existing trip completely contains new trip

### FR-2: Driver Assignment
**Description:** Assign a driver to a trip with availability validation.

**Inputs:**
- Trip ID (required)
- Driver ID (required)
- Scheduled departure time (required)
- Scheduled arrival time (required)

**Validation:**
- Driver must exist
- Driver status must be 'active' (not on-leave, suspended, terminated)
- Driver must not have overlapping trips in the time range
- Time range must be valid (arrival after departure)

**Outputs:**
- Success: Driver assigned to trip
- Failure: 400 Bad Request (unavailable, invalid status), 404 Not Found

**Business Rules:**
- A driver can only be assigned to one trip at a time
- Same overlap detection logic as vehicle assignment
- Driver license must be valid (not expired)

### FR-3: Route Assignment
**Description:** Assign a route to a trip with validation.

**Inputs:**
- Trip ID (required)
- Route ID (required)

**Validation:**
- Route must exist
- Route status must be 'active' (not discontinued, under-maintenance)
- Route must have at least one stop

**Outputs:**
- Success: Route assigned to trip
- Failure: 400 Bad Request (invalid status), 404 Not Found

**Business Rules:**
- Only active routes can be assigned to trips
- Route's estimated duration should align with trip's scheduled times

### FR-4: Reassignment
**Description:** Change vehicle or driver assignment for an existing trip.

**Inputs:**
- Trip ID (required)
- New vehicle ID or driver ID (required)

**Validation:**
- Trip must exist and not be completed or cancelled
- New resource must be available for the trip's time range
- Exclude current trip when checking availability
- New resource status must be 'active'

**Outputs:**
- Success: 200 OK with updated trip
- Failure: 400 Bad Request (unavailable, invalid status), 404 Not Found

**Business Rules:**
- Can reassign resources for scheduled or delayed trips
- Cannot reassign for in-progress trips (must cancel and create new)
- Cannot reassign for completed or cancelled trips

### FR-5: Availability Check
**Description:** Check if a vehicle or driver is available for a specific time range.

**Inputs:**
- Resource ID (vehicle or driver)
- Start time (required)
- End time (required)
- Exclude trip ID (optional, for updates)

**Outputs:**
- Boolean: true if available, false if conflict exists
- If unavailable, return conflicting trip details

**Business Rules:**
- Check all non-cancelled trips for the resource
- Consider buffer time between trips (configurable, default: 30 minutes)

## Non-Functional Requirements

### NFR-1: Performance
- Availability checks complete in < 200ms
- Use compound indexes for efficient conflict detection
- Cache frequently checked resources

### NFR-2: Concurrency
- Handle concurrent trip creation with same resources
- Use optimistic locking or transactions
- Prevent race conditions in availability checks

### NFR-3: Data Integrity
- Maintain referential integrity with Vehicle, Driver, Route collections
- Validate resource status before assignment
- Atomic operations for assignment changes

## API Endpoints

- `POST /api/v1/trips` - Create trip with assignments (trips:create)
- `PUT /api/v1/trips/:id` - Update assignments (trips:update)
- `GET /api/v1/trips/availability/vehicle/:vehicleId` - Check vehicle availability (trips:read)
- `GET /api/v1/trips/availability/driver/:driverId` - Check driver availability (trips:read)

## Helper Functions

### `checkVehicleAvailability(vehicleId, startTime, endTime, excludeTripId)`
**Logic:**
```javascript
// Find overlapping trips for the vehicle
const overlappingTrips = await Trip.find({
  vehicle: vehicleId,
  status: { $nin: ['cancelled', 'completed'] },
  _id: { $ne: excludeTripId },
  $or: [
    // New trip starts during existing trip
    { scheduledDeparture: { $lte: startTime }, scheduledArrival: { $gt: startTime } },
    // New trip ends during existing trip
    { scheduledDeparture: { $lt: endTime }, scheduledArrival: { $gte: endTime } },
    // New trip contains existing trip
    { scheduledDeparture: { $gte: startTime }, scheduledArrival: { $lte: endTime } },
    // Existing trip contains new trip
    { scheduledDeparture: { $lte: startTime }, scheduledArrival: { $gte: endTime } }
  ]
});

return overlappingTrips.length === 0;
```

### `checkDriverAvailability(driverId, startTime, endTime, excludeTripId)`
**Logic:** Same as vehicle availability check, but for driver field

### `validateResourceStatus(resourceType, resourceId)`
**Logic:**
```javascript
if (resourceType === 'vehicle') {
  const vehicle = await Vehicle.findById(resourceId);
  return vehicle && vehicle.status === 'active';
}
if (resourceType === 'driver') {
  const driver = await Driver.findById(driverId);
  return driver && driver.employmentStatus === 'active' && 
         new Date(driver.licenseExpiry) > new Date();
}
if (resourceType === 'route') {
  const route = await Route.findById(routeId);
  return route && route.status === 'active';
}
```

## Test Cases

### TC-1: Assign Available Vehicle
- Input: Trip with available vehicle
- Expected: 201 Created, vehicle assigned

### TC-2: Assign Unavailable Vehicle
- Input: Trip with vehicle having overlapping trip
- Expected: 400 Bad Request, conflict error

### TC-3: Assign Inactive Vehicle
- Input: Trip with vehicle in maintenance status
- Expected: 400 Bad Request, invalid status error

### TC-4: Assign Available Driver
- Input: Trip with available driver
- Expected: 201 Created, driver assigned

### TC-5: Assign Unavailable Driver
- Input: Trip with driver having overlapping trip
- Expected: 400 Bad Request, conflict error

### TC-6: Assign Suspended Driver
- Input: Trip with suspended driver
- Expected: 400 Bad Request, invalid status error

### TC-7: Assign Inactive Route
- Input: Trip with discontinued route
- Expected: 400 Bad Request, invalid status error

### TC-8: Reassign Vehicle
- Input: Update trip with new available vehicle
- Expected: 200 OK, vehicle reassigned

### TC-9: Reassign to Unavailable Vehicle
- Input: Update trip with unavailable vehicle
- Expected: 400 Bad Request, conflict error

### TC-10: Check Vehicle Availability - Available
- Input: Vehicle ID, time range with no conflicts
- Expected: 200 OK, available: true

### TC-11: Check Vehicle Availability - Unavailable
- Input: Vehicle ID, time range with conflict
- Expected: 200 OK, available: false, conflicting trips

### TC-12: Concurrent Trip Creation
- Input: Two simultaneous requests for same vehicle/time
- Expected: One succeeds (201), one fails (400 conflict)

### TC-13: Buffer Time Validation
- Input: Trip ending at 10:00, new trip starting at 10:15 (15min buffer)
- Expected: 400 Bad Request, insufficient buffer time

### TC-14: Exclude Current Trip in Update
- Input: Update trip times, check availability excluding itself
- Expected: 200 OK, availability check excludes current trip
