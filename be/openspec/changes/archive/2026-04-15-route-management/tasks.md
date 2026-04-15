## 1. Update RBAC Seed File

- [x] 1.1 Add route permissions to seedRolesPermissions.js (routes:create, routes:read, routes:update, routes:delete)
- [x] 1.2 Update Manager role in seedRolesPermissions.js to include route permissions
- [x] 1.3 Update Admin role to include route permissions (Admin should have all permissions)
- [x] 1.4 Run seed script to verify Manager role has route permissions: npm run seed:roles

## 2. Create Route Model

- [x] 2.1 Create src/models/Route.model.js with Mongoose schema including basic fields (name, code, description)
- [x] 2.2 Add geography fields to schema (origin, destination, distance)
- [x] 2.3 Add operational fields to schema (status, serviceType, estimatedDuration, discontinuedDate)
- [x] 2.4 Add stops array field (array of ObjectId references to RouteStop)
- [x] 2.5 Add schema validation rules (required fields, unique constraint for code, enum for status and serviceType)
- [x] 2.6 Add custom validators (distance > 0, estimatedDuration > 0)
- [x] 2.7 Add indexes for code (unique), status, and createdAt
- [x] 2.8 Configure timestamps option and uppercase/trim transformations for string fields
- [x] 2.9 Add pre-remove middleware to cascade delete associated route stops

## 3. Create RouteStop Model

- [x] 3.1 Create src/models/RouteStop.model.js with Mongoose schema including route reference and stop info (stopName, stopCode, address)
- [x] 3.2 Add sequence and distance fields (sequence, distanceFromStart)
- [x] 3.3 Add timing fields (estimatedArrivalTime, estimatedDepartureTime)
- [x] 3.4 Add coordinates embedded document (latitude, longitude) with validation
- [x] 3.5 Add schema validation rules (required fields, coordinate range validation)
- [x] 3.6 Add compound index for route and sequence (unique together)
- [x] 3.7 Configure timestamps option

## 4. Create Route Controller

- [x] 4.1 Create src/controllers/route.controller.js with asyncHandler wrapper
- [x] 4.2 Implement createRoute function with validation and duplicate check (code)
- [x] 4.3 Implement getAllRoutes function with pagination, filtering (status, serviceType), sorting, and search (name, code, origin, destination)
- [x] 4.4 Implement getRouteById function with populated stops, error handling for not found
- [x] 4.5 Implement updateRoute function with discontinued status validation (prevent status change if discontinued)
- [x] 4.6 Implement deleteRoute function with cascade delete of stops, error handling for not found
- [x] 4.7 Implement addStopToRoute function with sequence uniqueness validation
- [x] 4.8 Implement updateRouteStop function with sequence uniqueness validation and route ownership check
- [x] 4.9 Implement removeStopFromRoute function with route ownership check

## 5. Create Route Routes with Swagger Documentation

- [x] 5.1 Create src/routes/route.routes.js with Express router
- [x] 5.2 Add POST /api/v1/routes route with protect and checkPermission('routes', 'create') middleware
- [x] 5.3 Add GET /api/v1/routes route with protect and checkPermission('routes', 'read') middleware
- [x] 5.4 Add GET /api/v1/routes/:id route with protect and checkPermission('routes', 'read') middleware
- [x] 5.5 Add PUT /api/v1/routes/:id route with protect and checkPermission('routes', 'update') middleware
- [x] 5.6 Add DELETE /api/v1/routes/:id route with protect and checkPermission('routes', 'delete') middleware
- [x] 5.7 Add POST /api/v1/routes/:id/stops route with protect and checkPermission('routes', 'update') middleware
- [x] 5.8 Add PUT /api/v1/routes/:id/stops/:stopId route with protect and checkPermission('routes', 'update') middleware
- [x] 5.9 Add DELETE /api/v1/routes/:id/stops/:stopId route with protect and checkPermission('routes', 'update') middleware
- [x] 5.10 Add Swagger JSDoc annotations for all route endpoints with request/response schemas
- [x] 5.11 Add Swagger JSDoc annotations for all route stop endpoints with request/response schemas

## 6. Register Route Routes

- [x] 6.1 Add route routes to src/server.js: app.use('/api/v1/routes', require('./routes/route.routes'))

## 7. Create Route Seed File

- [x] 7.1 Create src/config/seedRoutes.js with database connection and disconnection
- [x] 7.2 Add sample route data (at least 3-5 routes with different statuses and service types)
- [x] 7.3 Add sample route stop data for each route (2-5 stops per route with proper sequencing)
- [x] 7.4 Implement idempotent seed logic (clear existing routes and stops before inserting)
- [x] 7.5 Add npm script to package.json: "seed:routes": "node src/config/seedRoutes.js"

## 8. Testing and Verification

- [x] 8.1 Test POST /api/v1/routes with valid data (verify 201 response)
- [x] 8.2 Test POST with duplicate code (verify 400 error)
- [x] 8.3 Test POST with missing required fields (verify 400 validation error)
- [x] 8.4 Test GET /api/v1/routes with pagination (verify correct page and limit)
- [x] 8.5 Test GET with status filter (verify only matching routes returned)
- [x] 8.6 Test GET with serviceType filter (verify only matching routes returned)
- [x] 8.7 Test GET with search query (verify search across name, code, origin, destination)
- [x] 8.8 Test GET /api/v1/routes/:id with valid ID (verify 200 response with populated stops)
- [x] 8.9 Test PUT /api/v1/routes/:id with valid updates (verify 200 response)
- [x] 8.10 Test PUT to change status of discontinued route (verify 400 error)
- [x] 8.11 Test DELETE /api/v1/routes/:id (verify 200 response and cascade delete of stops)
- [x] 8.12 Test POST /api/v1/routes/:id/stops with valid stop data (verify 201 response)
- [x] 8.13 Test POST stop with duplicate sequence (verify 400 error)
- [x] 8.14 Test PUT /api/v1/routes/:id/stops/:stopId with valid updates (verify 200 response)
- [x] 8.15 Test DELETE /api/v1/routes/:id/stops/:stopId (verify 200 response)
- [x] 8.16 Test all endpoints without authentication (verify 401 errors)
- [x] 8.17 Test all endpoints with Manager role (verify access granted)
- [x] 8.18 Test all endpoints without required permissions (verify 403 errors)
- [x] 8.19 Verify Swagger documentation displays correctly at /api-docs

## 9. Generate Test Report

- [x] 9.1 Run npm run test:report route-management
- [x] 9.2 Verify report generated in be/docs/TEST_REPORT_ROUTE-MANAGEMENT.md
- [x] 9.3 Ensure 15-20 tests with proper [Integration], [Negative], [Security], [Performance] tags
