## Context

The Bus Management System currently manages users, roles, permissions, vehicles, and drivers, but lacks route management capabilities. This design adds a complete route management module with route stops, following the existing RBAC architecture and API patterns.

**Current State:**
- RBAC system with User, Role, Permission models
- Vehicle and Driver management with CRUD operations
- JWT-based authentication with access and refresh tokens
- Swagger documentation for all endpoints

**Constraints:**
- Must follow existing Express + Mongoose patterns
- Must integrate with current RBAC system (checkPermission middleware)
- Must maintain consistency with vehicle and driver management implementations
- Must include comprehensive Swagger documentation

## Goals / Non-Goals

**Goals:**
- Implement complete route CRUD operations with RBAC protection
- Track route operational status lifecycle (active, inactive, under-maintenance, discontinued)
- Manage route stops with sequence, timing, and distance information
- Enable search and filtering by status and service type
- Provide seed data for development and testing
- Generate comprehensive test suite with 15 tests

**Non-Goals:**
- Real-time route tracking or GPS integration
- Route optimization algorithms
- Dynamic pricing based on routes
- Integration with external mapping services
- Schedule management (future feature)
- Vehicle-route or driver-route assignments (future feature)

## Decisions

### 1. Route and RouteStop Model Relationship

**Decision:** Use two separate models with Route referencing RouteStop IDs in an array.

**Route Model Fields:**
- Basic: name, code (unique), description
- Geography: origin, destination, distance (km)
- Operational: status (enum), serviceType (enum), estimatedDuration (minutes)
- Stops: stops array (references to RouteStop IDs)
- Timestamps: createdAt, updatedAt (automatic)

**RouteStop Model Fields:**
- Reference: route (ObjectId reference to Route)
- Stop info: stopName, stopCode, address, coordinates (lat/lng)
- Sequence: sequence (order in route), distanceFromStart (km)
- Timing: estimatedArrivalTime (minutes from start), estimatedDepartureTime
- Timestamps: createdAt, updatedAt (automatic)

**Rationale:**
- Separate collection allows flexible stop management
- Array of references maintains route-stop relationship
- Sequence field enables proper ordering
- Supports multiple routes sharing same physical stops (future)
- Matches existing pattern (similar to how User references Role)

**Alternatives Considered:**
- Embedded stops in Route: Rejected - limits flexibility, makes stop updates harder
- Junction table: Rejected - adds unnecessary complexity for current requirements

### 2. Status Lifecycle Management

**Decision:** Implement status validation similar to Vehicle and Driver patterns.

**Rules:**
- discontinued status is permanent (cannot change once set)
- discontinuedDate automatically set when status changes to discontinued
- Active routes can transition to any status except discontinued
- Inactive/under-maintenance routes can return to active

**Rationale:**
- Prevents accidental reactivation of discontinued routes
- Maintains data integrity for historical records
- Mirrors vehicle/driver status logic for consistency

### 3. Permission Structure

**Decision:** Use resource-based permissions following existing pattern.

**Permissions:**
- `routes:create` - Create new routes and route stops
- `routes:read` - View route information
- `routes:update` - Modify routes and route stops
- `routes:delete` - Remove routes and route stops

**Role Assignment:**
- Manager: All route permissions (create, read, update, delete)
- Admin: Inherits all permissions automatically

**Rationale:**
- Consistent with existing permission naming (vehicles:*, drivers:*)
- Manager role appropriate for operational route management
- Admin bypass ensures system administrators always have access

### 4. API Endpoint Design

**Decision:** RESTful endpoints under `/api/v1/routes` with nested route stop management.

**Endpoints:**
- POST /api/v1/routes - Create route (routes:create)
- GET /api/v1/routes - List all with pagination, filtering, search (routes:read)
- GET /api/v1/routes/:id - Get single route with populated stops (routes:read)
- PUT /api/v1/routes/:id - Update route (routes:update)
- DELETE /api/v1/routes/:id - Delete route and associated stops (routes:delete)
- POST /api/v1/routes/:id/stops - Add stop to route (routes:update)
- PUT /api/v1/routes/:id/stops/:stopId - Update route stop (routes:update)
- DELETE /api/v1/routes/:id/stops/:stopId - Remove stop from route (routes:update)

**Query Parameters for GET /routes:**
- page, limit - Pagination
- sort - Sort by any field (e.g., -createdAt, name)
- status - Filter by operational status
- serviceType - Filter by service type
- search - Search across name, code, origin, destination

**Rationale:**
- Matches vehicle/driver management API structure
- Nested endpoints for route stops maintain clear hierarchy
- Supports common operational queries
- Familiar pattern for frontend developers

### 5. Validation Strategy

**Decision:** Use Mongoose schema validation with custom validators.

**Validations:**
- Required fields: name, code, origin, destination, distance, estimatedDuration
- Unique constraints: code
- Enum validation: status, serviceType
- Number validation: distance > 0, estimatedDuration > 0
- RouteStop sequence must be unique within a route
- Coordinates validation (lat: -90 to 90, lng: -180 to 180)

**Rationale:**
- Mongoose validation provides immediate feedback
- Unique indexes prevent duplicate records at database level
- Enum constraints ensure data consistency
- Custom validators for business rules

### 6. Cascade Delete Strategy

**Decision:** When deleting a route, automatically delete all associated route stops.

**Implementation:**
- Use Mongoose pre-remove middleware on Route model
- Delete all RouteStop documents where route matches deleted route ID

**Rationale:**
- Prevents orphaned route stops
- Maintains referential integrity
- Follows common database cascade pattern
- Simplifies cleanup operations

**Alternative Considered:**
- Soft delete: Rejected for initial implementation - adds complexity

### 7. Seed Data Strategy

**Decision:** Create separate seedRoutes.js file with 3-5 sample routes and their stops.

**Sample Data:**
- Mix of operational statuses (active, inactive, under-maintenance, discontinued)
- Various service types (express, local, shuttle)
- Different route lengths and stop counts
- Realistic names, codes, and locations

**Rationale:**
- Follows existing pattern (seedVehicles.js, seedDrivers.js)
- Separate file keeps concerns isolated
- Idempotent seeding (clear and recreate) for consistent dev environment

### 8. Testing Approach

**Decision:** Create comprehensive test suite with 15-20 tests covering all scenarios.

**Test Distribution:**
- Integration (40%): CRUD operations, pagination, filtering, search, nested stop operations
- Negative (30%): Validation errors, duplicate code, missing fields, discontinued status
- Security (20%): Auth required, permission checks, role-based access
- Performance (10%): Pagination with large datasets

**Rationale:**
- Matches vehicle/driver management test structure
- Balanced coverage across test categories
- Academic documentation quality (tag-based classification)
- Automated test report generation

## Risks / Trade-offs

**[Risk]** No validation for stop sequence gaps
→ **Mitigation:** Document that sequence should be continuous; future enhancement can add validation

**[Risk]** No audit trail for route changes
→ **Mitigation:** Timestamps track last update; full audit log is future enhancement

**[Risk]** Discontinued routes remain in database
→ **Mitigation:** Soft delete approach maintains historical records; hard delete available via API

**[Risk]** No validation that stops belong to correct route
→ **Mitigation:** Route reference in RouteStop ensures integrity; API enforces correct associations

**[Trade-off]** Separate RouteStop collection vs embedded stops
→ **Decision:** Separate collection for flexibility; slight performance cost for population

**[Trade-off]** No real-time route tracking in this phase
→ **Decision:** Deferred to future feature; keeps this change focused and deliverable

**[Trade-off]** No schedule management integration
→ **Decision:** Routes define the path; schedules (future) will reference routes

## Migration Plan

**Deployment Steps:**
1. Deploy code changes (models, controllers, routes)
2. Run `npm run seed:roles` to add route permissions
3. Run `npm run seed:routes` to populate sample data
4. Verify Swagger docs at /api-docs
5. Run test suite: `npm test -- route.api.test.js`
6. Generate test report: `npm run test:report route-management`

**Rollback Strategy:**
- Remove route routes from server.js
- Drop routes and routestops collections: `db.routes.drop()`, `db.routestops.drop()`
- Remove route permissions from roles
- No breaking changes to existing APIs

**Database Changes:**
- New collections: `routes`, `routestops`
- Indexes: 
  - routes: code (unique), status, createdAt
  - routestops: route, sequence (compound index for uniqueness)
- No changes to existing collections

## Open Questions

None - design is complete and ready for implementation.
