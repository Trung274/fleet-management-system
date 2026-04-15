## Why

The Bus Management System needs a trip scheduling module to plan and manage scheduled trips by assigning vehicles, drivers, and routes to specific time slots. Currently, there's no way to create trip schedules, assign resources (vehicles and drivers) to routes, track trip status, or manage trip execution. This capability is essential for operational planning, resource allocation, and service delivery tracking.

## What Changes

- Add Trip model with trip scheduling information (route, vehicle, driver, departure/arrival times, status)
- Create CRUD API endpoints for trip management with RBAC protection
- Implement trip search and filtering by date, status, route, vehicle, and driver
- Add resource availability validation (prevent double-booking of vehicles and drivers)
- Add trip-specific permissions (trips:create, trips:read, trips:update, trips:delete)
- Extend Manager role to include trip management permissions
- Create seed data for sample trips

## Capabilities

### New Capabilities
- `trip-crud`: Complete CRUD operations for trip management (create, list, get by ID, update, delete)
- `trip-assignment`: Assign vehicles and drivers to routes for specific time slots with availability validation
- `trip-status-management`: Trip lifecycle tracking (scheduled, in-progress, completed, cancelled, delayed)

### Modified Capabilities
<!-- No existing capabilities are being modified -->

## Impact

**New Files:**
- `src/models/Trip.model.js` - Mongoose schema for trip data with references to Route, Vehicle, and Driver
- `src/controllers/trip.controller.js` - Business logic for trip operations and resource validation
- `src/routes/trip.routes.js` - API routes with Swagger documentation
- `src/config/seedTrips.js` - Sample trip data for development
- `src/tests/trip.api.test.js` - API test suite

**Modified Files:**
- `src/config/seedRolesPermissions.js` - Add trip permissions to Manager and Admin roles
- `src/server.js` - Register trip routes
- `package.json` - Add seed:trips script

**API Changes:**
- New endpoints under `/api/v1/trips`
- No breaking changes to existing APIs

**Database Changes:**
- New collection: `trips`
- New indexes on: scheduledDeparture, status, route, vehicle, driver
- No changes to existing collections

**Dependencies:**
- Requires existing Route, Vehicle, and Driver models
- Integrates with existing RBAC system

**Rollback Plan:**
- Drop trips collection if needed
- Remove trip routes from server.js
- Remove trip permissions from roles
- Delete trip-related files
