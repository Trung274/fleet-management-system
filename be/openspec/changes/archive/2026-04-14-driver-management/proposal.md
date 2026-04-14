## Why

The Bus Management System needs a driver management module to track driver information, qualifications, and availability. Currently, there's no way to manage driver records, assign drivers to vehicles, or track their employment status and certifications. This capability is essential for operational planning and compliance tracking.

## What Changes

- Add Driver model with personal information, license details, employment status, and qualifications
- Create CRUD API endpoints for driver management with RBAC protection
- Implement driver search and filtering by status, license type, and availability
- Add driver-specific permissions (drivers:create, drivers:read, drivers:update, drivers:delete)
- Extend Manager role to include driver management permissions
- Create seed data for sample drivers

## Capabilities

### New Capabilities
- `driver-crud`: Complete CRUD operations for driver management (create, list, get by ID, update, delete)
- `driver-status-management`: Driver employment status tracking and lifecycle management (active, on-leave, suspended, terminated)
- `driver-qualification-tracking`: Track driver licenses, certifications, and expiration dates

### Modified Capabilities
<!-- No existing capabilities are being modified -->

## Impact

**New Files:**
- `src/models/Driver.model.js` - Mongoose schema for driver data
- `src/controllers/driver.controller.js` - Business logic for driver operations
- `src/routes/driver.routes.js` - API routes with Swagger documentation
- `src/config/seedDrivers.js` - Sample driver data for development
- `src/tests/driver.api.test.js` - API test suite

**Modified Files:**
- `src/config/seedRolesPermissions.js` - Add driver permissions to Manager and Admin roles
- `src/server.js` - Register driver routes

**API Changes:**
- New endpoints under `/api/v1/drivers`
- No breaking changes to existing APIs
