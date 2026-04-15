# Trip CRUD Specification

## Overview
Complete CRUD operations for trip management including create, read (list/single), update, and delete operations with proper RBAC integration.

## Functional Requirements

### FR-1: Create Trip
**Description:** Create a new scheduled trip by assigning a vehicle and driver to a route for a specific time slot.

**Inputs:**
- Route ID (required)
- Vehicle ID (required)
- Driver ID (required)
- Scheduled departure time (required, ISO8601 DateTime)
- Scheduled arrival time (required, ISO8601 DateTime)
- Fare (optional, number >= 0)
- Notes (optional, string)

**Validation:**
- All referenced resources (route, vehicle, driver) must exist
- Scheduled departure must be in the future
- Scheduled arrival must be after scheduled departure
- Vehicle must not have overlapping trips
- Driver must not have overlapping trips
- Vehicle status must be 'active'
- Driver status must be 'active'
- Route status must be 'active'

**Outputs:**
- Success: 201 Created with trip object (populated with route, vehicle, driver)
- Failure: 400 Bad Request (validation errors, conflicts), 404 Not Found (resource not found)

**Business Rules:**
- No double-booking of vehicles
- No double-booking of drivers
- Only active resources can be assigned

### FR-2: List Trips
**Description:** Retrieve a paginated list of trips with filtering and sorting capabilities.

**Inputs:**
- page (optional, default: 1)
- limit (optional, default: 10, max: 100)
- status (optional, filter by trip status)
- route (optional, filter by route ID)
- vehicle (optional, filter by vehicle ID)
- driver (optional, filter by driver ID)
- date (optional, filter by departure date YYYY-MM-DD)
- startDate (optional, filter trips from this date)
- endDate (optional, filter trips until this date)
- sort (optional, default: -scheduledDeparture)

**Outputs:**
- Success: 200 OK with paginated trip list
- Response includes: data array, pagination metadata (page, limit, total, pages)
- Each trip populated with route, vehicle, driver basic info

**Business Rules:**
- Results sorted by scheduled departure (newest first) by default
- Date filters are inclusive

### FR-3: Get Trip by ID
**Description:** Retrieve detailed information about a specific trip.

**Inputs:**
- Trip ID (required, MongoDB ObjectId)

**Outputs:**
- Success: 200 OK with full trip details
- Trip populated with route (including stops), vehicle, driver
- Failure: 404 Not Found (trip doesn't exist)

### FR-4: Update Trip
**Description:** Update trip details including resource assignments, times, and operational data.

**Inputs:**
- Trip ID (required)
- Fields to update (partial trip object)

**Validation:**
- If changing vehicle: check availability for new vehicle
- If changing driver: check availability for new driver
- If changing times: validate new times and check resource availability
- Validate status transitions if status is being changed
- Cannot update completed or cancelled trips (except notes field)
- Require cancellationReason when setting status to 'cancelled'
- Require delayReason when setting status to 'delayed'

**Outputs:**
- Success: 200 OK with updated trip object
- Failure: 400 Bad Request (validation errors), 404 Not Found

**Business Rules:**
- Status transitions must follow lifecycle rules
- Completed and cancelled trips are immutable (except notes)
- Resource changes must maintain availability constraints

### FR-5: Delete Trip
**Description:** Delete a scheduled trip.

**Inputs:**
- Trip ID (required)

**Validation:**
- Trip status must be 'scheduled'
- Cannot delete in-progress, completed, or cancelled trips

**Outputs:**
- Success: 200 OK with success message
- Failure: 400 Bad Request (invalid status), 404 Not Found

**Business Rules:**
- Only scheduled trips can be deleted
- Use cancel operation for other statuses

## Non-Functional Requirements

### NFR-1: Performance
- List endpoint response time < 500ms for 1000 trips
- Availability checks complete in < 200ms
- Efficient indexing on scheduledDeparture, vehicle, driver

### NFR-2: Security
- All endpoints require JWT authentication
- Permission checks: trips:create, trips:read, trips:update, trips:delete
- Input sanitization to prevent NoSQL injection

### NFR-3: Data Integrity
- Referential integrity with Route, Vehicle, Driver collections
- Atomic operations for availability checks
- Transaction support for concurrent trip creation

## API Endpoints

- `POST /api/v1/trips` - Create trip (trips:create)
- `GET /api/v1/trips` - List trips (trips:read)
- `GET /api/v1/trips/:id` - Get trip (trips:read)
- `PUT /api/v1/trips/:id` - Update trip (trips:update)
- `DELETE /api/v1/trips/:id` - Delete trip (trips:delete)

## Test Cases

### TC-1: Create Trip with Valid Data
- Input: Valid trip data with available resources
- Expected: 201 Created, trip object returned

### TC-2: Create Trip with Unavailable Vehicle
- Input: Trip data with vehicle already assigned to overlapping trip
- Expected: 400 Bad Request, conflict error message

### TC-3: Create Trip with Unavailable Driver
- Input: Trip data with driver already assigned to overlapping trip
- Expected: 400 Bad Request, conflict error message

### TC-4: Create Trip with Past Departure Time
- Input: Trip data with scheduledDeparture in the past
- Expected: 400 Bad Request, validation error

### TC-5: Create Trip with Invalid Time Range
- Input: scheduledArrival before scheduledDeparture
- Expected: 400 Bad Request, validation error

### TC-6: List Trips with Pagination
- Input: page=1, limit=10
- Expected: 200 OK, 10 trips, pagination metadata

### TC-7: List Trips Filtered by Status
- Input: status=scheduled
- Expected: 200 OK, only scheduled trips returned

### TC-8: List Trips Filtered by Date Range
- Input: startDate=2026-04-15, endDate=2026-04-20
- Expected: 200 OK, trips within date range

### TC-9: Get Trip by Valid ID
- Input: Valid trip ID
- Expected: 200 OK, full trip details with populated references

### TC-10: Get Trip by Invalid ID
- Input: Non-existent trip ID
- Expected: 404 Not Found

### TC-11: Update Trip Times
- Input: New scheduledDeparture and scheduledArrival
- Expected: 200 OK, updated trip with new times

### TC-12: Update Completed Trip
- Input: Attempt to update completed trip
- Expected: 400 Bad Request, immutable trip error

### TC-13: Delete Scheduled Trip
- Input: Trip ID with status 'scheduled'
- Expected: 200 OK, trip deleted

### TC-14: Delete In-Progress Trip
- Input: Trip ID with status 'in-progress'
- Expected: 400 Bad Request, cannot delete error

### TC-15: Require Authentication
- Input: Request without auth token
- Expected: 401 Unauthorized

### TC-16: Verify Permissions
- Input: User without trips:create permission
- Expected: 403 Forbidden
