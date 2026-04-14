## 1. Update RBAC Seed File

- [x] 1.1 Add vehicle permissions to seedRolesPermissions.js (vehicles:create, vehicles:read, vehicles:update, vehicles:delete)
- [x] 1.2 Create Manager role in seedRolesPermissions.js with vehicle permissions assigned
- [x] 1.3 Update Admin role to include vehicle permissions (Admin should have all permissions)
- [x] 1.4 Run seed script to verify Manager role is created: npm run seed:roles

## 2. Create Vehicle Model

- [x] 2.1 Create src/models/Vehicle.model.js with Mongoose schema including all fields (registrationNumber, make, model, year, capacity, status, color, vin, notes)
- [x] 2.2 Add schema validation rules (required fields, unique constraints, enum for status, min/max for year and capacity)
- [x] 2.3 Add indexes for registrationNumber (unique), status, and createdAt
- [x] 2.4 Configure timestamps option and uppercase/trim transformations

## 3. Create Vehicle Controller

- [x] 3.1 Create src/controllers/vehicle.controller.js with asyncHandler wrapper
- [x] 3.2 Implement createVehicle function with validation and duplicate check
- [x] 3.3 Implement getAllVehicles function with pagination, filtering (status), sorting, and search (registrationNumber, make, model)
- [x] 3.4 Implement getVehicleById function with error handling for not found
- [x] 3.5 Implement updateVehicle function with retired status validation (prevent status change if retired)
- [x] 3.6 Implement deleteVehicle function with error handling for not found

## 4. Create Vehicle Routes with Swagger Documentation

- [x] 4.1 Create src/routes/vehicle.routes.js with Express router
- [x] 4.2 Add POST /api/v1/vehicles route with protect and checkPermission('vehicles', 'create') middleware
- [x] 4.3 Add GET /api/v1/vehicles route with protect and checkPermission('vehicles', 'read') middleware
- [x] 4.4 Add GET /api/v1/vehicles/:id route with protect and checkPermission('vehicles', 'read') middleware
- [x] 4.5 Add PUT /api/v1/vehicles/:id route with protect and checkPermission('vehicles', 'update') middleware
- [x] 4.6 Add DELETE /api/v1/vehicles/:id route with protect and checkPermission('vehicles', 'delete') middleware
- [x] 4.7 Add Swagger JSDoc annotations for POST endpoint with request body schema and response codes (201, 400, 401, 403)
- [x] 4.8 Add Swagger JSDoc annotations for GET all endpoint with query parameters (page, limit, sort, status, search) and response codes (200, 401, 403)
- [x] 4.9 Add Swagger JSDoc annotations for GET by ID endpoint with path parameter and response codes (200, 404, 401, 403)
- [x] 4.10 Add Swagger JSDoc annotations for PUT endpoint with request body schema and response codes (200, 400, 404, 401, 403)
- [x] 4.11 Add Swagger JSDoc annotations for DELETE endpoint with response codes (200, 404, 401, 403)

## 5. Register Vehicle Routes

- [x] 5.1 Add vehicle routes to src/server.js: app.use('/api/v1/vehicles', require('./routes/vehicle.routes'))

## 6. Create Vehicle Seed File

- [x] 6.1 Create src/config/seedVehicles.js with database connection and disconnection
- [x] 6.2 Add sample vehicle data (at least 5 vehicles with different statuses)
- [x] 6.3 Implement idempotent seed logic (clear existing vehicles before inserting)
- [x] 6.4 Add npm script to package.json: "seed:vehicles": "node src/config/seedVehicles.js"

## 7. Testing and Verification

- [x] 7.1 Test POST /api/v1/vehicles with valid data (verify 201 response)
- [x] 7.2 Test POST with duplicate registrationNumber (verify 400 error)
- [x] 7.3 Test POST with missing required fields (verify 400 validation error)
- [x] 7.4 Test GET /api/v1/vehicles with pagination (verify correct page and limit)
- [x] 7.5 Test GET with status filter (verify only matching vehicles returned)
- [x] 7.6 Test GET with search query (verify search across registrationNumber, make, model)
- [x] 7.7 Test GET /api/v1/vehicles/:id with valid ID (verify 200 response)
- [x] 7.8 Test GET by ID with invalid ID (verify 404 error)
- [x] 7.9 Test PUT /api/v1/vehicles/:id with valid updates (verify 200 response)
- [x] 7.10 Test PUT to change status of retired vehicle (verify 400 error)
- [x] 7.11 Test DELETE /api/v1/vehicles/:id (verify 200 response and vehicle removed)
- [x] 7.12 Test all endpoints without authentication (verify 401 errors)
- [x] 7.13 Test all endpoints with Manager role (verify access granted)
- [x] 7.14 Test all endpoints without required permissions (verify 403 errors)
- [x] 7.15 Verify Swagger documentation displays correctly at /api-docs
