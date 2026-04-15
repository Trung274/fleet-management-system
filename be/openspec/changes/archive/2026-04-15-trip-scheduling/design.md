# Trip Scheduling - Technical Design

## Overview

The trip scheduling module enables operational planning by creating scheduled trips that assign vehicles and drivers to routes for specific time slots. This module ensures resource availability validation to prevent conflicts and provides comprehensive trip lifecycle management.

## Data Model

### Trip Model

**Collection:** `trips`

**Schema:**
```javascript
{
  // Route Assignment
  route: ObjectId (ref: Route, required, indexed),
  
  // Resource Assignment
  vehicle: ObjectId (ref: Vehicle, required, indexed),
  driver: ObjectId (ref: Driver, required, indexed),
  
  // Scheduling
  scheduledDeparture: Date (required, indexed),
  scheduledArrival: Date (required),
  actualDeparture: Date,
  actualArrival: Date,
  
  // Status
  status: String (enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'delayed'], default: 'scheduled', indexed),
  
  // Operational Details
  passengerCount: Number (default: 0, min: 0),
  fare: Number (min: 0),
  notes: String,
  
  // Cancellation/Delay
  cancellationReason: String,
  delayReason: String,
  delayDuration: Number (minutes),
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `route` (for filtering by route)
- `vehicle` (for availability checks)
- `driver` (for availability checks)
- `scheduledDeparture` (for date-based queries)
- `status` (for filtering by status)
- Compound index: `{ vehicle: 1, scheduledDeparture: 1 }` (for conflict detection)
- Compound index: `{ driver: 1, scheduledDeparture: 1 }` (for conflict detection)

**Validation Rules:**
- `scheduledDeparture` must be in the future (for new trips)
- `scheduledArrival` must be after `scheduledDeparture`
- `actualArrival` must be after `actualDeparture` (if both provided)
- `passengerCount` cannot exceed vehicle capacity
- `status` transitions must follow lifecycle rules
- `cancellationReason` required when status is 'cancelled'
- `delayReason` required when status is 'delayed'

**Business Rules:**
1. **Resource Availability:** Vehicle and driver must not have overlapping trips
2. **Status Lifecycle:**
   - `scheduled` → `in-progress`, `cancelled`, `delayed`
   - `in-progress` → `completed`, `cancelled`
   - `delayed` → `in-progress`, `cancelled`
   - `completed` and `cancelled` are terminal states
3. **Actual Times:** Can only be set when status is `in-progress` or `completed`
4. **Vehicle Status:** Assigned vehicle must be `active` (not maintenance, retired, etc.)
5. **Driver Status:** Assigned driver must be `active` (not on-leave, suspended, terminated)
6. **Route Status:** Assigned route must be `active` (not discontinued, under-maintenance)

## API Endpoints

### Base Path: `/api/v1/trips`

### 1. Create Trip
- **Endpoint:** `POST /api/v1/trips`
- **Auth:** Required (JWT)
- **Permission:** `trips:create`
- **Request Body:**
  ```json
  {
    "route": "ObjectId",
    "vehicle": "ObjectId",
    "driver": "ObjectId",
    "scheduledDeparture": "ISO8601 DateTime",
    "scheduledArrival": "ISO8601 DateTime",
    "fare": 50.00,
    "notes": "Regular morning service"
  }
  ```
- **Validation:**
  - Check vehicle availability (no overlapping trips)
  - Check driver availability (no overlapping trips)
  - Verify vehicle status is `active`
  - Verify driver status is `active`
  - Verify route status is `active`
  - Verify scheduledDeparture is in the future
  - Verify scheduledArrival > scheduledDeparture
- **Response:** `201 Created` with trip object
- **Error Cases:**
  - `400` - Validation errors, resource conflicts
  - `404` - Route, vehicle, or driver not found

### 2. Get All Trips
- **Endpoint:** `GET /api/v1/trips`
- **Auth:** Required (JWT)
- **Permission:** `trips:read`
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 10, max: 100)
  - `status` (filter by status)
  - `route` (filter by route ID)
  - `vehicle` (filter by vehicle ID)
  - `driver` (filter by driver ID)
  - `date` (filter by departure date - YYYY-MM-DD)
  - `startDate` (filter trips from this date)
  - `endDate` (filter trips until this date)
  - `sort` (default: -scheduledDeparture)
- **Response:** `200 OK` with paginated trips
- **Populate:** route, vehicle, driver (basic info only)

### 3. Get Trip by ID
- **Endpoint:** `GET /api/v1/trips/:id`
- **Auth:** Required (JWT)
- **Permission:** `trips:read`
- **Response:** `200 OK` with full trip details
- **Populate:** route (with stops), vehicle, driver
- **Error Cases:**
  - `404` - Trip not found

### 4. Update Trip
- **Endpoint:** `PUT /api/v1/trips/:id`
- **Auth:** Required (JWT)
- **Permission:** `trips:update`
- **Request Body:** Partial trip object
- **Validation:**
  - If changing vehicle/driver/times: check availability
  - Validate status transitions
  - Prevent updates to completed/cancelled trips (except notes)
  - Require cancellationReason when setting status to 'cancelled'
  - Require delayReason when setting status to 'delayed'
- **Response:** `200 OK` with updated trip
- **Error Cases:**
  - `400` - Invalid status transition, resource conflicts
  - `404` - Trip not found

### 5. Delete Trip
- **Endpoint:** `DELETE /api/v1/trips/:id`
- **Auth:** Required (JWT)
- **Permission:** `trips:delete`
- **Validation:**
  - Only allow deletion of 'scheduled' trips
  - Prevent deletion of in-progress, completed, or cancelled trips
- **Response:** `200 OK` with success message
- **Error Cases:**
  - `400` - Cannot delete non-scheduled trip
  - `404` - Trip not found

### 6. Start Trip
- **Endpoint:** `POST /api/v1/trips/:id/start`
- **Auth:** Required (JWT)
- **Permission:** `trips:update`
- **Validation:**
  - Trip status must be 'scheduled' or 'delayed'
  - Set actualDeparture to current time
  - Update status to 'in-progress'
- **Response:** `200 OK` with updated trip
- **Error Cases:**
  - `400` - Invalid status for starting
  - `404` - Trip not found

### 7. Complete Trip
- **Endpoint:** `POST /api/v1/trips/:id/complete`
- **Auth:** Required (JWT)
- **Permission:** `trips:update`
- **Request Body:**
  ```json
  {
    "passengerCount": 45,
    "notes": "Trip completed successfully"
  }
  ```
- **Validation:**
  - Trip status must be 'in-progress'
  - Set actualArrival to current time
  - Update status to 'completed'
- **Response:** `200 OK` with updated trip
- **Error Cases:**
  - `400` - Invalid status for completion
  - `404` - Trip not found

### 8. Cancel Trip
- **Endpoint:** `POST /api/v1/trips/:id/cancel`
- **Auth:** Required (JWT)
- **Permission:** `trips:update`
- **Request Body:**
  ```json
  {
    "cancellationReason": "Vehicle breakdown"
  }
  ```
- **Validation:**
  - Trip status must be 'scheduled', 'delayed', or 'in-progress'
  - cancellationReason is required
  - Update status to 'cancelled'
- **Response:** `200 OK` with updated trip
- **Error Cases:**
  - `400` - Invalid status for cancellation, missing reason
  - `404` - Trip not found

## Controller Functions

### 1. `createTrip`
- Validate request body
- Check route, vehicle, driver existence
- Verify resource statuses (active)
- Check vehicle availability (no overlapping trips)
- Check driver availability (no overlapping trips)
- Validate scheduling times
- Create trip
- Return created trip with populated references

### 2. `getAllTrips`
- Parse query parameters
- Build filter object (status, route, vehicle, driver, date range)
- Apply pagination
- Populate route, vehicle, driver
- Return paginated results

### 3. `getTripById`
- Find trip by ID
- Populate route (with stops), vehicle, driver
- Return trip or 404

### 4. `updateTrip`
- Find trip by ID
- Validate status transition if status is being changed
- If changing resources or times, check availability
- Validate business rules
- Update trip
- Return updated trip

### 5. `deleteTrip`
- Find trip by ID
- Verify status is 'scheduled'
- Delete trip
- Return success message

### 6. `startTrip`
- Find trip by ID
- Verify status is 'scheduled' or 'delayed'
- Set actualDeparture to current time
- Update status to 'in-progress'
- Return updated trip

### 7. `completeTrip`
- Find trip by ID
- Verify status is 'in-progress'
- Set actualArrival to current time
- Update passengerCount and notes if provided
- Update status to 'completed'
- Return updated trip

### 8. `cancelTrip`
- Find trip by ID
- Verify status is not 'completed' or 'cancelled'
- Validate cancellationReason is provided
- Update status to 'cancelled'
- Set cancellationReason
- Return updated trip

## Helper Functions

### `checkVehicleAvailability(vehicleId, scheduledDeparture, scheduledArrival, excludeTripId)`
- Query trips for the vehicle with overlapping time ranges
- Exclude current trip if updating
- Return true if available, false if conflict exists

### `checkDriverAvailability(driverId, scheduledDeparture, scheduledArrival, excludeTripId)`
- Query trips for the driver with overlapping time ranges
- Exclude current trip if updating
- Return true if available, false if conflict exists

### `validateStatusTransition(currentStatus, newStatus)`
- Check if status transition is allowed
- Return true if valid, false otherwise

## RBAC Integration

### New Permissions
- `trips:create` - Create new trips
- `trips:read` - View trips
- `trips:update` - Update trips, start, complete, cancel
- `trips:delete` - Delete scheduled trips

### Role Updates
- **Admin:** All trip permissions
- **Manager:** All trip permissions
- **User:** trips:read only

## Seed Data

Create sample trips with:
- 10-15 trips across different dates (past, today, future)
- Various statuses (scheduled, in-progress, completed, cancelled)
- Different routes, vehicles, and drivers
- Some with actual times, passenger counts
- Examples of delays and cancellations

## Testing Strategy

### Integration Tests
- Create trip with valid data
- Get all trips with pagination
- Get trip by ID with populated references
- Update trip details
- Delete scheduled trip
- Start trip (scheduled → in-progress)
- Complete trip (in-progress → completed)
- Cancel trip with reason

### Negative Tests
- Create trip with unavailable vehicle
- Create trip with unavailable driver
- Create trip with invalid times
- Update trip with invalid status transition
- Delete non-scheduled trip
- Start trip with invalid status
- Complete trip with invalid status
- Cancel trip without reason

### Business Rule Tests
- Prevent double-booking of vehicles
- Prevent double-booking of drivers
- Validate passenger count against vehicle capacity
- Enforce status lifecycle rules
- Require cancellation reason
- Prevent updates to completed trips

### Security Tests
- Require authentication for all endpoints
- Verify permission checks
- Test with different roles (Admin, Manager, User)

## Error Handling

- **400 Bad Request:** Validation errors, business rule violations
- **401 Unauthorized:** Missing or invalid authentication
- **403 Forbidden:** Insufficient permissions
- **404 Not Found:** Trip, route, vehicle, or driver not found
- **409 Conflict:** Resource availability conflicts
- **500 Internal Server Error:** Unexpected errors

## Performance Considerations

- Index on scheduledDeparture for date-based queries
- Compound indexes for availability checks
- Limit populated fields to essential data
- Implement efficient date range queries
- Consider caching for frequently accessed routes/vehicles/drivers

## Future Enhancements

- Real-time trip tracking with GPS coordinates
- Passenger booking and seat reservation
- Automated notifications for trip updates
- Trip analytics and reporting
- Recurring trip templates
- Multi-leg trip support
- Integration with payment systems
