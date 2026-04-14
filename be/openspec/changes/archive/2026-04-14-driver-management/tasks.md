## 1. Update RBAC Seed File

- [x] 1.1 Add driver permissions to seedRolesPermissions.js (drivers:create, drivers:read, drivers:update, drivers:delete)
- [x] 1.2 Update Manager role in seedRolesPermissions.js to include driver permissions
- [x] 1.3 Update Admin role to include driver permissions (Admin should have all permissions)
- [x] 1.4 Run seed script to verify Manager role has driver permissions: npm run seed:roles

## 2. Create Driver Model

- [x] 2.1 Create src/models/Driver.model.js with Mongoose schema including personal info fields (firstName, lastName, email, phone, dateOfBirth, address)
- [x] 2.2 Add license fields to schema (licenseNumber, licenseType, licenseExpiry) with validation
- [x] 2.3 Add employment fields to schema (employmentStatus, hireDate, terminationDate) with enum for status
- [x] 2.4 Add emergencyContact embedded document (name, phone, relationship) and notes field
- [x] 2.5 Add schema validation rules (required fields, unique constraints for licenseNumber and email, enum for employmentStatus and licenseType)
- [x] 2.6 Add custom validators (licenseExpiry must be future date, dateOfBirth must be past date)
- [x] 2.7 Add indexes for licenseNumber (unique), email (unique), employmentStatus, and createdAt
- [x] 2.8 Configure timestamps option and uppercase/trim transformations for string fields
- [x] 2.9 Add pre-save middleware to set terminationDate when status changes to terminated

## 3. Create Driver Controller

- [x] 3.1 Create src/controllers/driver.controller.js with asyncHandler wrapper
- [x] 3.2 Implement createDriver function with validation and duplicate check (licenseNumber and email)
- [x] 3.3 Implement getAllDrivers function with pagination, filtering (status, licenseType), sorting, and search (firstName, lastName, email, licenseNumber)
- [x] 3.4 Implement getDriverById function with error handling for not found
- [x] 3.5 Implement updateDriver function with terminated status validation (prevent status change if terminated)
- [x] 3.6 Implement deleteDriver function with error handling for not found

## 4. Create Driver Routes with Swagger Documentation

- [x] 4.1 Create src/routes/driver.routes.js with Express router
- [x] 4.2 Add POST /api/v1/drivers route with protect and checkPermission('drivers', 'create') middleware
- [x] 4.3 Add GET /api/v1/drivers route with protect and checkPermission('drivers', 'read') middleware
- [x] 4.4 Add GET /api/v1/drivers/:id route with protect and checkPermission('drivers', 'read') middleware
- [x] 4.5 Add PUT /api/v1/drivers/:id route with protect and checkPermission('drivers', 'update') middleware
- [x] 4.6 Add DELETE /api/v1/drivers/:id route with protect and checkPermission('drivers', 'delete') middleware
- [x] 4.7 Add Swagger JSDoc annotations for POST endpoint with request body schema and response codes (201, 400, 401, 403)
- [x] 4.8 Add Swagger JSDoc annotations for GET all endpoint with query parameters (page, limit, sort, status, licenseType, search) and response codes (200, 401, 403)
- [x] 4.9 Add Swagger JSDoc annotations for GET by ID endpoint with path parameter and response codes (200, 404, 401, 403)
- [x] 4.10 Add Swagger JSDoc annotations for PUT endpoint with request body schema and response codes (200, 400, 404, 401, 403)
- [x] 4.11 Add Swagger JSDoc annotations for DELETE endpoint with response codes (200, 404, 401, 403)

## 5. Register Driver Routes

- [x] 5.1 Add driver routes to src/server.js: app.use('/api/v1/drivers', require('./routes/driver.routes'))

## 6. Create Driver Seed File

- [x] 6.1 Create src/config/seedDrivers.js with database connection and disconnection
- [x] 6.2 Add sample driver data (at least 5-7 drivers with different statuses: active, on-leave, suspended, terminated)
- [x] 6.3 Include drivers with various license types (Class A, Class B, Class C) and some with expiring licenses
- [x] 6.4 Implement idempotent seed logic (clear existing drivers before inserting)
- [x] 6.5 Add npm script to package.json: "seed:drivers": "node src/config/seedDrivers.js"

## 7. Testing and Verification

- [x] 7.1 Test POST /api/v1/drivers with valid data (verify 201 response)
- [x] 7.2 Test POST with duplicate licenseNumber (verify 400 error)
- [x] 7.3 Test POST with duplicate email (verify 400 error)
- [x] 7.4 Test POST with missing required fields (verify 400 validation error)
- [x] 7.5 Test POST with past license expiry date (verify 400 validation error)
- [x] 7.6 Test GET /api/v1/drivers with pagination (verify correct page and limit)
- [x] 7.7 Test GET with status filter (verify only matching drivers returned)
- [x] 7.8 Test GET with licenseType filter (verify only matching drivers returned)
- [x] 7.9 Test GET with search query (verify search across firstName, lastName, email, licenseNumber)
- [x] 7.10 Test GET /api/v1/drivers/:id with valid ID (verify 200 response)
- [x] 7.11 Test GET by ID with invalid ID (verify 404 error)
- [x] 7.12 Test PUT /api/v1/drivers/:id with valid updates (verify 200 response)
- [x] 7.13 Test PUT to change status of terminated driver (verify 400 error)
- [x] 7.14 Test PUT to set status to terminated (verify terminationDate is set automatically)
- [x] 7.15 Test DELETE /api/v1/drivers/:id (verify 200 response and driver removed)
- [x] 7.16 Test all endpoints without authentication (verify 401 errors)
- [x] 7.17 Test all endpoints with Manager role (verify access granted)
- [x] 7.18 Test all endpoints without required permissions (verify 403 errors)
- [x] 7.19 Verify Swagger documentation displays correctly at /api-docs

## 8. Generate Test Report

- [x] 8.1 Run npm run test:report driver-management
- [x] 8.2 Verify report generated in be/docs/TEST_REPORT_DRIVER-MANAGEMENT.md
- [x] 8.3 Ensure 15-20 tests with proper [Integration], [Negative], [Security], [Performance] tags
