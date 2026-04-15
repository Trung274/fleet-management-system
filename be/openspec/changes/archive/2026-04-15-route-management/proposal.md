## Why

The Bus Management System needs a route management module to define and manage bus routes, including stops, schedules, and route assignments. Currently, there's no way to create routes, manage route stops, or track which vehicles and drivers are assigned to specific routes. This capability is essential for operational planning, scheduling, and service delivery.

## What Changes

- Add Route model with route information (name, code, origin, destination, distance, estimated duration)
- Add RouteStop model to manage stops along each route with sequence and timing
- Create CRUD API endpoints for route management with RBAC protection
- Implement route search and filtering by status and service type
- Add route-specific permissions (routes:create, routes:read, routes:update, routes:delete)
- Extend Manager role to include route management permissions
- Create seed data for sample routes and route stops

## Capabilities

### New Capabilities
- `route-crud`: Complete CRUD operations for route management (create, list, get by ID, update, delete)
- `route-stop-management`: Manage stops along routes with sequence, arrival/departure times, and distance tracking
- `route-status-management`: Route operational status tracking (active, inactive, under-maintenance, discontinued)

### Modified Capabilities
<!-- No existing capabilities are being modified -->

## Impact

**New Files:**
- `src/models/Route.model.js` - Mongoose schema for route data
- `src/models/RouteStop.model.js` - Mongoose schema for route stops
- `src/controllers/route.controller.js` - Business logic for route operations
- `src/routes/route.routes.js` - API routes with Swagger documentation
- `src/config/seedRoutes.js` - Sample route and route stop data for development
- `src/tests/route.api.test.js` - API test suite

**Modified Files:**
- `src/config/seedRolesPermissions.js` - Add route permissions to Manager and Admin roles
- `src/server.js` - Register route routes

**API Changes:**
- New endpoints under `/api/v1/routes`
- No breaking changes to existing APIs

**Database Changes:**
- New collections: `routes`, `routestops`
- No changes to existing collections
