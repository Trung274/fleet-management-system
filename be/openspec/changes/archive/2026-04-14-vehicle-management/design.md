## Context

The Bus Management System currently lacks vehicle management capabilities. This design implements a complete vehicle management module following the existing RBAC architecture and codebase patterns. The module will integrate seamlessly with the existing auth system and follow established conventions for models, controllers, routes, and Swagger documentation.

## Goals / Non-Goals

**Goals:**
- Implement full CRUD operations for vehicle management
- Integrate with existing RBAC system using permission-based access control
- Track vehicle operational status with validation rules
- Provide comprehensive API documentation via Swagger
- Enable filtering, searching, and pagination for vehicle lists
- Create seed data for initial vehicle setup

**Non-Goals:**
- Vehicle assignment to routes or schedules (future feature)
- Maintenance history tracking (future feature)
- Real-time vehicle location tracking
- Vehicle-to-driver assignment
- Fuel consumption or mileage tracking

## Decisions

### Decision 1: Use Permission-Based Access Control (checkPermission)
**Choice:** Use `checkPermission` middleware instead of `authorize` for all vehicle endpoints.

**Rationale:**
- More granular control over vehicle operations (create, read, update, delete)
- Consistent with RBAC best practices where permissions are assigned to roles
- Allows flexible role configuration without code changes
- Admin role automatically bypasses all permission checks
- New Manager role will have full vehicle management permissions

**Alternatives Considered:**
- `authorize()` middleware: Too coarse-grained, would require hardcoding specific role names
- Public endpoints: Inappropriate for vehicle management operations

**Implementation:**
- Permissions: `vehicles:create`, `vehicles:read`, `vehicles:update`, `vehicles:delete`
- Middleware chain: `protect` → `checkPermission(resource, action)`
- Roles with vehicle access: Admin (all permissions), Manager (vehicle permissions only)

### Decision 2: Vehicle Status as Enum with Validation
**Choice:** Implement status as a string enum with Mongoose validation and business logic for retired vehicles.

**Rationale:**
- Predefined status values prevent data inconsistency
- Mongoose enum validation provides database-level constraint
- Business rule: retired vehicles cannot change status (prevents accidental reactivation)
- Simple to query and filter

**Status Values:**
- `active`: Vehicle is operational and available
- `maintenance`: Vehicle is under maintenance
- `out-of-service`: Vehicle is temporarily unavailable
- `retired`: Vehicle is permanently removed from service (terminal state)

**Alternatives Considered:**
- Boolean flags (isActive, isRetired): Less expressive, harder to query
- Status history table: Over-engineered for current requirements, can be added later

### Decision 3: Unique Registration Number with Index
**Choice:** Make `registrationNumber` unique with a database index.

**Rationale:**
- Registration numbers are unique identifiers in real-world vehicle management
- Prevents duplicate vehicle entries
- Index improves query performance for lookups by registration
- Mongoose unique constraint provides database-level enforcement

**Implementation:**
- Schema: `registrationNumber: { type: String, required: true, unique: true, trim: true, uppercase: true }`
- Index: Automatically created by Mongoose unique constraint
- Error handling: DuplicateKey error (code 11000) handled by global errorHandler

### Decision 4: Search Functionality Across Multiple Fields
**Choice:** Implement search query parameter that searches across registrationNumber, make, and model fields.

**Rationale:**
- Users need flexible search capabilities
- Common use case: "Find vehicle by registration or make"
- MongoDB regex search is sufficient for current scale
- Can be upgraded to text index if performance becomes an issue

**Implementation:**
```javascript
if (search) {
  query.$or = [
    { registrationNumber: { $regex: search, $options: 'i' } },
    { make: { $regex: search, $options: 'i' } },
    { model: { $regex: search, $options: 'i' } }
  ];
}
```

**Alternatives Considered:**
- MongoDB text index: More complex setup, overkill for current needs
- Separate search endpoints per field: Poor UX, more API surface

### Decision 5: Standard Pagination with Mongoose-Paginate-V2
**Choice:** Use existing pagination pattern from the codebase (manual implementation with skip/limit).

**Rationale:**
- Consistency with existing endpoints (users, roles, permissions)
- No additional dependencies needed
- Simple and performant for expected data volumes
- Returns standard format: `{ success: true, data: [], count: total, pagination: {} }`

**Implementation:**
- Query params: `page` (default: 1), `limit` (default: 10, max: 100)
- Response includes: total count, current page, total pages, hasNext, hasPrev

### Decision 6: Seed File for Initial Vehicle Data
**Choice:** Create separate `seedVehicles.js` file following existing seed pattern.

**Rationale:**
- Consistent with codebase convention (separate seed per domain)
- Idempotent: can be run multiple times safely
- Useful for development and testing
- Does not interfere with `seedRolesPermissions.js`

**Implementation:**
- File: `src/config/seedVehicles.js`
- NPM script: `"seed:vehicles": "node src/config/seedVehicles.js"`
- Behavior: Clears existing vehicles, inserts sample data, disconnects

### Decision 7: Create Manager Role for Vehicle Management
**Choice:** Add a new "Manager" role in seedRolesPermissions.js with vehicle management permissions.

**Rationale:**
- Separation of concerns: Not all users need full admin access
- Manager role can handle day-to-day vehicle operations without system-wide admin privileges
- Follows principle of least privilege
- Makes it easy to assign vehicle management responsibilities to specific users

**Permissions for Manager Role:**
- All vehicle permissions: vehicles:create, vehicles:read, vehicles:update, vehicles:delete
- Profile permissions: profile:read, profile:update (to manage own profile)

**Alternatives Considered:**
- Assign permissions manually via API: Less maintainable, requires manual setup on each deployment
- Use only Admin role: Violates principle of least privilege, gives unnecessary system access

**Implementation:**
- Update `seedRolesPermissions.js` to create Manager role
- Assign vehicle permissions to Manager role during seed
- Admin role still has all permissions (including vehicles)

## Affected Files

**New Files:**
- `src/models/Vehicle.model.js` - Mongoose schema with validation
- `src/controllers/vehicle.controller.js` - Business logic (5 functions: create, getAll, getById, update, delete)
- `src/routes/vehicle.routes.js` - Express routes with Swagger JSDoc
- `src/config/seedVehicles.js` - Seed script for sample vehicles

**Modified Files:**
- `src/server.js` - Register vehicle routes: `app.use('/api/v1/vehicles', require('./routes/vehicle.routes'))`
- `src/config/seedRolesPermissions.js` - Add Manager role with vehicle permissions
- `package.json` - Add seed script: `"seed:vehicles": "node src/config/seedVehicles.js"`

## Data Model

### Vehicle Schema
```javascript
{
  registrationNumber: String (required, unique, uppercase, trim),
  make: String (required, trim),
  model: String (required, trim),
  year: Number (required, min: 1900, max: current year + 1),
  capacity: Number (required, min: 1),
  status: String (enum: ['active', 'maintenance', 'out-of-service', 'retired'], default: 'active'),
  color: String (optional, trim),
  vin: String (optional, unique, uppercase, trim),
  notes: String (optional),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:**
- `registrationNumber` (unique, auto-created)
- `status` (for filtering)
- `createdAt` (for sorting)

## API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | /api/v1/vehicles | vehicles:create | Create new vehicle |
| GET | /api/v1/vehicles | vehicles:read | List all vehicles (paginated, filterable) |
| GET | /api/v1/vehicles/:id | vehicles:read | Get single vehicle by ID |
| PUT | /api/v1/vehicles/:id | vehicles:update | Update vehicle |
| DELETE | /api/v1/vehicles/:id | vehicles:delete | Delete vehicle |

**Query Parameters (GET /api/v1/vehicles):**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort` - Sort field (prefix with `-` for descending, e.g., `-createdAt`)
- `status` - Filter by status (comma-separated for multiple: `active,maintenance`)
- `search` - Search in registrationNumber, make, model

## Risks / Trade-offs

**[Risk] Retired vehicles cannot be reactivated**
→ **Mitigation:** Document this behavior clearly in API docs. If reactivation is needed, admin can create a new vehicle record with same details.

**[Risk] No soft delete - vehicle deletion is permanent**
→ **Mitigation:** Consider adding soft delete in future if audit trail is required. For now, retired status serves as "soft removal" from active fleet.

**[Risk] Regex search may be slow with large datasets**
→ **Mitigation:** Current implementation is sufficient for expected scale (hundreds to low thousands of vehicles). Can add MongoDB text index if performance degrades.

**[Risk] No validation for year field against current date**
→ **Mitigation:** Add max validation: `max: new Date().getFullYear() + 1` to allow next year's models.

**[Trade-off] Simple status model vs. status history**
→ **Decision:** Start simple with single status field. Status history can be added later if audit requirements emerge.

**[Trade-off] No vehicle-to-route or vehicle-to-driver relationships**
→ **Decision:** Keep vehicle module independent. Relationships will be added in future features (route management, driver management).

## Migration Plan

**Deployment Steps:**
1. Update seedRolesPermissions.js to add Manager role and vehicle permissions
2. Run seed script: `npm run seed:roles` to create Manager role with vehicle permissions
3. Deploy code changes (models, controllers, routes)
4. Server restart will auto-create `vehicles` collection on first use
5. Run seed script: `npm run seed:vehicles` (optional, for dev/test environments)
6. Assign Manager role to appropriate users via API

**Rollback Strategy:**
- Remove vehicle routes from `server.js`
- Drop `vehicles` collection: `db.vehicles.drop()`
- Remove Manager role or remove vehicle permissions from Manager role
- Revert code changes

**No Breaking Changes:** This is a new module with no impact on existing functionality.
