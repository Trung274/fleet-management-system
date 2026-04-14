## Why

The Bus Management System needs a comprehensive vehicle management module to track and manage the fleet of buses. Currently, there's no way to store vehicle information, track maintenance schedules, monitor vehicle status, or manage vehicle assignments. This capability is essential for operational efficiency and fleet oversight.

## What Changes

- Add new Vehicle model with comprehensive vehicle data (registration, make, model, capacity, status, etc.)
- Create CRUD API endpoints for vehicle management
- Implement vehicle status tracking (active, maintenance, retired, etc.)
- Add RBAC permissions for vehicle operations (vehicles:create, vehicles:read, vehicles:update, vehicles:delete)
- Integrate with existing auth/RBAC system
- Add Swagger documentation for all vehicle endpoints
- Create seed data for initial vehicle setup

## Capabilities

### New Capabilities
- `vehicle-crud`: Complete CRUD operations for vehicle management including create, read (list/single), update, and delete operations with proper RBAC integration
- `vehicle-status-management`: Track and update vehicle operational status (active, maintenance, out-of-service, retired) with status transition validation

### Modified Capabilities
<!-- No existing capabilities are being modified -->

## Impact

**Affected Code:**
- New files: `src/models/Vehicle.model.js`, `src/controllers/vehicle.controller.js`, `src/routes/vehicle.routes.js`, `src/config/seedVehicles.js`
- Modified: `src/server.js` (register new vehicle routes)
- Modified: `src/config/seedRolesPermissions.js` (add Manager role with vehicle permissions)
- Modified: `package.json` (add seed:vehicles script)

**Database:**
- New collection: `vehicles`
- New indexes on: registrationNumber (unique), status, createdAt

**API:**
- New endpoints under `/api/v1/vehicles`
- New permissions: vehicles:create, vehicles:read, vehicles:update, vehicles:delete

**Rollback Plan:**
- Drop vehicles collection if needed
- Remove vehicle routes from server.js
- Remove vehicle permissions from roles
- Delete vehicle-related files
