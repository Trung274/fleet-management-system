## Context

The Bus Management System currently manages users, roles, permissions, and vehicles, but lacks driver management capabilities. This design adds a complete driver management module following the existing RBAC architecture and API patterns established in the codebase.

**Current State:**
- RBAC system with User, Role, Permission models
- Vehicle management with CRUD operations
- JWT-based authentication with access and refresh tokens
- Swagger documentation for all endpoints

**Constraints:**
- Must follow existing Express + Mongoose patterns
- Must integrate with current RBAC system (checkPermission middleware)
- Must maintain consistency with vehicle management implementation
- Must include comprehensive Swagger documentation

## Goals / Non-Goals

**Goals:**
- Implement complete driver CRUD operations with RBAC protection
- Track driver employment status lifecycle (active, on-leave, suspended, terminated)
- Store driver qualifications (license type, number, expiration dates)
- Enable search and filtering by status, license type, and availability
- Provide seed data for development and testing
- Generate comprehensive test suite with 15-20 tests

**Non-Goals:**
- Driver-vehicle assignment (future feature)
- Driver scheduling or shift management
- Integration with external license verification systems
- Driver performance tracking or ratings
- Payroll or compensation management

## Decisions

### 1. Driver Model Schema Design

**Decision:** Create a comprehensive Driver model with personal info, license details, employment status, and qualifications.

**Fields:**
- Personal: firstName, lastName, email, phone, dateOfBirth, address
- License: licenseNumber (unique), licenseType (enum), licenseExpiry
- Employment: employmentStatus (enum: active, on-leave, suspended, terminated), hireDate, terminationDate
- Additional: emergencyContact (name, phone, relationship), notes
- Timestamps: createdAt, updatedAt (automatic)

**Rationale:**
- Follows same pattern as Vehicle model for consistency
- licenseNumber unique constraint prevents duplicate driver records
- employmentStatus enum provides clear lifecycle states
- emergencyContact embedded document (no separate collection needed)
- Matches existing codebase conventions (timestamps, indexes)

**Alternatives Considered:**
- Separate License model: Rejected - adds unnecessary complexity for 1:1 relationship
- Reference to User model: Rejected - drivers may not need system access initially

### 2. Status Lifecycle Management

**Decision:** Implement status validation similar to Vehicle's retired status logic.

**Rules:**
- terminated status is permanent (cannot change once set)
- terminationDate automatically set when status changes to terminated
- terminationDate cleared if status changes from terminated (validation prevents this)

**Rationale:**
- Prevents accidental reactivation of terminated drivers
- Maintains data integrity for employment records
- Mirrors vehicle retirement logic for consistency

### 3. Permission Structure

**Decision:** Use resource-based permissions following existing pattern.

**Permissions:**
- `drivers:create` - Create new driver records
- `drivers:read` - View driver information
- `drivers:update` - Modify driver records
- `drivers:delete` - Remove driver records

**Role Assignment:**
- Manager: All driver permissions (create, read, update, delete)
- Admin: Inherits all permissions automatically

**Rationale:**
- Consistent with existing permission naming (vehicles:*, members:*)
- Manager role appropriate for operational driver management
- Admin bypass ensures system administrators always have access

### 4. API Endpoint Design

**Decision:** RESTful endpoints under `/api/v1/drivers` with standard CRUD operations.

**Endpoints:**
- POST /api/v1/drivers - Create driver (drivers:create)
- GET /api/v1/drivers - List all with pagination, filtering, search (drivers:read)
- GET /api/v1/drivers/:id - Get single driver (drivers:read)
- PUT /api/v1/drivers/:id - Update driver (drivers:update)
- DELETE /api/v1/drivers/:id - Delete driver (drivers:delete)

**Query Parameters for GET /drivers:**
- page, limit - Pagination
- sort - Sort by any field (e.g., -createdAt, firstName)
- status - Filter by employmentStatus
- licenseType - Filter by license type
- search - Search across firstName, lastName, email, licenseNumber

**Rationale:**
- Matches vehicle management API structure exactly
- Familiar pattern for frontend developers
- Supports common operational queries (find active drivers, search by name/license)

### 5. Validation Strategy

**Decision:** Use Mongoose schema validation with custom validators.

**Validations:**
- Required fields: firstName, lastName, email, phone, licenseNumber, licenseType, licenseExpiry
- Unique constraints: licenseNumber, email
- Enum validation: employmentStatus, licenseType
- Date validation: licenseExpiry must be future date, dateOfBirth must be past
- Email format validation (Mongoose built-in)
- Phone format validation (basic pattern)

**Rationale:**
- Mongoose validation provides immediate feedback
- Unique indexes prevent duplicate records at database level
- Enum constraints ensure data consistency
- Custom validators for business rules (license expiry, age requirements)

### 6. Seed Data Strategy

**Decision:** Create separate seedDrivers.js file with 5-7 sample drivers.

**Sample Data:**
- Mix of employment statuses (active, on-leave, suspended, terminated)
- Various license types (Class A, Class B, Class C)
- Some with expiring licenses (for testing alerts)
- Realistic names, emails, phone numbers

**Rationale:**
- Follows existing pattern (seedVehicles.js, seedRolesPermissions.js)
- Separate file keeps concerns isolated
- Idempotent seeding (clear and recreate) for consistent dev environment

### 7. Testing Approach

**Decision:** Create comprehensive test suite with 15-20 tests covering all scenarios.

**Test Distribution:**
- Integration (40%): CRUD operations, pagination, filtering, search
- Negative (30%): Validation errors, duplicate license, missing fields, terminated status
- Security (20%): Auth required, permission checks, role-based access
- Performance (10%): Pagination with large datasets

**Rationale:**
- Matches vehicle management test structure
- Balanced coverage across test categories
- Academic documentation quality (tag-based classification)
- Automated test report generation

## Risks / Trade-offs

**[Risk]** License expiration not actively monitored
→ **Mitigation:** Future feature - add scheduled job to flag expiring licenses

**[Risk]** No audit trail for status changes
→ **Mitigation:** Timestamps track last update; full audit log is future enhancement

**[Risk]** Terminated drivers remain in database
→ **Mitigation:** Soft delete approach maintains historical records; hard delete available via API

**[Risk]** Email uniqueness may conflict with User model
→ **Mitigation:** Drivers and Users are separate entities; driver email is for contact only

**[Trade-off]** Embedded emergencyContact vs separate collection
→ **Decision:** Embedded for simplicity; 1:1 relationship doesn't justify separate collection

**[Trade-off]** No driver-vehicle assignment in this phase
→ **Decision:** Deferred to future feature; keeps this change focused and deliverable

## Migration Plan

**Deployment Steps:**
1. Deploy code changes (model, controller, routes)
2. Run `npm run seed:roles` to add driver permissions
3. Run `npm run seed:drivers` to populate sample data
4. Verify Swagger docs at /api-docs
5. Run test suite: `npm test -- driver.api.test.js`
6. Generate test report: `npm run test:report driver-management`

**Rollback Strategy:**
- Remove driver routes from server.js
- Drop drivers collection: `db.drivers.drop()`
- Remove driver permissions from roles
- No breaking changes to existing APIs

**Database Changes:**
- New collection: `drivers`
- Indexes: licenseNumber (unique), email (unique), employmentStatus, createdAt
- No changes to existing collections

## Open Questions

None - design is complete and ready for implementation.
