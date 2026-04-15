# Trip Scheduling Implementation Tasks

## 1. Update RBAC Seed File

- [x] 1.1 Add trip permissions to seedRolesPermissions.js (trips:create, trips:read, trips:update, trips:delete)
- [x] 1.2 Update Manager role in seedRolesPermissions.js to include trip permissions
- [x] 1.3 Update Admin role to include trip permissions (Admin should have all permissions)
- [x] 1.4 Run seed script to verify Manager role has trip permissions: npm run seed:roles

## 2. Create Trip Model

- [x] 2.1 Create src/models/Trip.model.js with Mongoose schema including route, vehicle, driver references
- [x] 2.2 Add scheduling fields to schema (scheduledDeparture, scheduledArrival, actualDeparture, actualArrival)
- [x] 2.3 Add status field with enum (scheduled, in-progress, completed, cancelled, delayed) and default 'scheduled'
- [x] 2.4 Add operational fields (passengerCount, fare, notes)
- [x] 2.5 Add cancellation/delay fields (cancellationReason, delayReason, delayDuration)
- [x] 2.6 Add schema validation rules (required fields, time validations)
- [x] 2.7 Add custom validators (scheduledArrival > scheduledDeparture, actualArrival > actualDeparture)
- [x] 2.8 Add indexes for route, vehicle, driver, scheduledDeparture, status
- [x] 2.9 Add compound indexes for availability checks: {vehicle: 1, scheduledDeparture: 1}, {driver: 1, scheduledDeparture: 1}
- [x] 2.10 Configure timestamps option

## 3. Create Trip Controller

- [x] 3.1 Create src/controllers/trip.controller.js with asyncHandler wrapper
- [x] 3.2 Implement createTrip function with resource validation and availability checks
- [x] 3.3 Implement getAllTrips function with pagination, filtering (status, route, vehicle, driver, date range), and sorting
- [x] 3.4 Implement getTripById function with populated references (route with stops, vehicle, driver)
- [x] 3.5 Implement updateTrip function with status transition validation and availability checks
- [x] 3.6 Implement deleteTrip function with status validation (only scheduled trips)
- [x] 3.7 Implement startTrip function (scheduled/delayed → in-progress, set actualDeparture)
- [x] 3.8 Implement completeTrip function (in-progress → completed, set actualArrival, update passengerCount)
- [x] 3.9 Implement cancelTrip function (validate status, require cancellationReason)
- [x] 3.10 Implement markTripDelayed function (scheduled → delayed, require delayReason and delayDuration)

## 4. Create Helper Functions

- [x] 4.1 Implement checkVehicleAvailability helper function with overlap detection logic
- [x] 4.2 Implement checkDriverAvailability helper function with overlap detection logic
- [x] 4.3 Implement validateStatusTransition helper function with lifecycle rules
- [x] 4.4 Implement validateResourceStatus helper function (check vehicle, driver, route status)

## 5. Create Trip Routes with Swagger Documentation

- [x] 5.1 Create src/routes/trip.routes.js with Express router
- [x] 5.2 Add POST /api/v1/trips route with protect and checkPermission('trips', 'create') middleware
- [x] 5.3 Add GET /api/v1/trips route with protect and checkPermission('trips', 'read') middleware
- [x] 5.4 Add GET /api/v1/trips/:id route with protect and checkPermission('trips', 'read') middleware
- [x] 5.5 Add PUT /api/v1/trips/:id route with protect and checkPermission('trips', 'update') middleware
- [x] 5.6 Add DELETE /api/v1/trips/:id route with protect and checkPermission('trips', 'delete') middleware
- [x] 5.7 Add POST /api/v1/trips/:id/start route with protect and checkPermission('trips', 'update') middleware
- [x] 5.8 Add POST /api/v1/trips/:id/complete route with protect and checkPermission('trips', 'update') middleware
- [x] 5.9 Add POST /api/v1/trips/:id/cancel route with protect and checkPermission('trips', 'update') middleware
- [x] 5.10 Add POST /api/v1/trips/:id/delay route with protect and checkPermission('trips', 'update') middleware
- [x] 5.11 Add Swagger JSDoc annotations for all CRUD endpoints with request/response schemas
- [x] 5.12 Add Swagger JSDoc annotations for all status management endpoints

## 6. Register Trip Routes

- [x] 6.1 Add trip routes to src/server.js: app.use('/api/v1/trips', require('./routes/trip.routes'))

## 7. Create Trip Seed File

- [x] 7.1 Create src/config/seedTrips.js with database connection and disconnection
- [x] 7.2 Add sample trip data (at least 10-15 trips with various statuses and dates)
- [x] 7.3 Include trips with different statuses (scheduled, in-progress, completed, cancelled, delayed)
- [x] 7.4 Include trips with actual times, passenger counts, and notes
- [x] 7.5 Include examples of cancelled and delayed trips with reasons
- [x] 7.6 Implement idempotent seed logic (clear existing trips before inserting)
- [x] 7.7 Add npm script to package.json: "seed:trips": "node src/config/seedTrips.js"

## 8. Testing and Verification - CRUD Operations

- [x] 8.1 Test POST /api/v1/trips with valid data (verify 201 response)
- [x] 8.2 Test POST with unavailable vehicle (verify 400 error)
- [x] 8.3 Test POST with unavailable driver (verify 400 error)
- [x] 8.4 Test POST with inactive vehicle (verify 400 error)
- [x] 8.5 Test POST with inactive driver (verify 400 error)
- [x] 8.6 Test POST with past departure time (verify 400 error)
- [x] 8.7 Test POST with invalid time range (arrival before departure) (verify 400 error)
- [x] 8.8 Test GET /api/v1/trips with pagination (verify correct page and limit)
- [x] 8.9 Test GET with status filter (verify only matching trips returned)
- [x] 8.10 Test GET with date range filter (verify trips within range)
- [x] 8.11 Test GET with route filter (verify only trips for that route)
- [x] 8.12 Test GET /api/v1/trips/:id with valid ID (verify 200 response with populated references)
- [x] 8.13 Test PUT /api/v1/trips/:id with valid updates (verify 200 response)
- [x] 8.14 Test PUT to update completed trip (verify 400 error)
- [x] 8.15 Test DELETE /api/v1/trips/:id for scheduled trip (verify 200 response)
- [x] 8.16 Test DELETE for in-progress trip (verify 400 error)

## 9. Testing and Verification - Status Management

- [x] 9.1 Test POST /api/v1/trips/:id/start for scheduled trip (verify status change to in-progress)
- [x] 9.2 Test POST /api/v1/trips/:id/start for delayed trip (verify status change to in-progress)
- [x] 9.3 Test POST /api/v1/trips/:id/start for completed trip (verify 400 error)
- [x] 9.4 Test POST /api/v1/trips/:id/complete for in-progress trip (verify status change to completed)
- [x] 9.5 Test POST /api/v1/trips/:id/complete with passenger count (verify passengerCount updated)
- [x] 9.6 Test POST /api/v1/trips/:id/complete for scheduled trip (verify 400 error)
- [x] 9.7 Test POST /api/v1/trips/:id/cancel for scheduled trip with reason (verify status change to cancelled)
- [x] 9.8 Test POST /api/v1/trips/:id/cancel for in-progress trip with reason (verify status change to cancelled)
- [x] 9.9 Test POST /api/v1/trips/:id/cancel without reason (verify 400 error)
- [x] 9.10 Test POST /api/v1/trips/:id/cancel for completed trip (verify 400 error)
- [x] 9.11 Test POST /api/v1/trips/:id/delay for scheduled trip (verify status change to delayed)
- [x] 9.12 Test POST /api/v1/trips/:id/delay for in-progress trip (verify 400 error)

## 10. Testing and Verification - Resource Assignment

- [x] 10.1 Test vehicle availability check with no conflicts (verify available)
- [x] 10.2 Test vehicle availability check with overlapping trip (verify unavailable)
- [x] 10.3 Test driver availability check with no conflicts (verify available)
- [x] 10.4 Test driver availability check with overlapping trip (verify unavailable)
- [x] 10.5 Test reassign vehicle to available vehicle (verify 200 response)
- [x] 10.6 Test reassign vehicle to unavailable vehicle (verify 400 error)
- [x] 10.7 Test reassign driver to available driver (verify 200 response)
- [x] 10.8 Test reassign driver to unavailable driver (verify 400 error)
- [x] 10.9 Test concurrent trip creation with same vehicle (verify one succeeds, one fails)

## 11. Testing and Verification - Security and Permissions

- [x] 11.1 Test all endpoints without authentication (verify 401 errors)
- [x] 11.2 Test all endpoints with Manager role (verify access granted)
- [x] 11.3 Test all endpoints without required permissions (verify 403 errors)
- [x] 11.4 Verify Swagger documentation displays correctly at /api-docs

## 12. Generate Test Report

- [x] 12.1 Run npm run test:report trip-scheduling
- [x] 12.2 Verify report generated in be/docs/TEST_REPORT_TRIP-SCHEDULING.md
- [x] 12.3 Ensure 25-30 tests with proper [Integration], [Negative], [Security], [Performance] tags
