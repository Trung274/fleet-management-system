## ADDED Requirements

### Requirement: Create Route
The system SHALL allow authorized users to create a new route record with all required route information.

#### Scenario: Successful route creation with valid data
- **WHEN** an authorized user sends POST /api/v1/routes with valid route data (name, code, origin, destination, distance, estimatedDuration)
- **THEN** system creates the route record, returns 201 status with the created route data

#### Scenario: Duplicate route code
- **WHEN** user attempts to create a route with an existing code
- **THEN** system returns 400 status with error message "Route with this code already exists"

#### Scenario: Missing required fields
- **WHEN** user sends POST request without required fields (name, code, origin, destination, distance, estimatedDuration)
- **THEN** system returns 400 status with validation error details

#### Scenario: Invalid distance value
- **WHEN** user sends POST request with distance less than or equal to 0
- **THEN** system returns 400 status with error message "Distance must be greater than 0"

#### Scenario: Unauthorized access
- **WHEN** user without routes:create permission attempts to create a route
- **THEN** system returns 403 status with "Insufficient permissions" error

#### Scenario: Unauthenticated request
- **WHEN** request is made without valid JWT token
- **THEN** system returns 401 status with "Not authorized" error

### Requirement: List All Routes
The system SHALL allow authorized users to retrieve a paginated list of all routes with filtering and sorting capabilities.

#### Scenario: Successful retrieval with pagination
- **WHEN** authorized user sends GET /api/v1/routes with query params (page, limit, sort)
- **THEN** system returns 200 status with paginated route list, total count, and pagination metadata

#### Scenario: Filter by status
- **WHEN** user sends GET /api/v1/routes?status=active
- **THEN** system returns only routes with status "active"

#### Scenario: Filter by service type
- **WHEN** user sends GET /api/v1/routes?serviceType=express
- **THEN** system returns only routes with serviceType "express"

#### Scenario: Search by name or code
- **WHEN** user sends GET /api/v1/routes?search=Downtown
- **THEN** system returns routes matching the search term in name, code, origin, or destination fields

#### Scenario: Sort by field
- **WHEN** user sends GET /api/v1/routes?sort=-createdAt
- **THEN** system returns routes sorted by creation date in descending order

#### Scenario: Unauthorized access
- **WHEN** user without routes:read permission attempts to list routes
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Get Single Route
The system SHALL allow authorized users to retrieve detailed information about a specific route by ID including populated stops.

#### Scenario: Successful retrieval by valid ID
- **WHEN** authorized user sends GET /api/v1/routes/:id with valid route ID
- **THEN** system returns 200 status with complete route details including populated stops array

#### Scenario: Route not found
- **WHEN** user requests a route with non-existent ID
- **THEN** system returns 404 status with "Route not found" error

#### Scenario: Invalid ID format
- **WHEN** user sends request with invalid MongoDB ObjectId format
- **THEN** system returns 404 status with "Route not found" error

#### Scenario: Unauthorized access
- **WHEN** user without routes:read permission attempts to get route details
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Update Route
The system SHALL allow authorized users to update existing route information with partial or complete data.

#### Scenario: Successful update with valid data
- **WHEN** authorized user sends PUT /api/v1/routes/:id with updated fields
- **THEN** system updates the route record and returns 200 status with updated route data

#### Scenario: Update with duplicate code
- **WHEN** user attempts to update code to one that already exists
- **THEN** system returns 400 status with "Route code already in use" error

#### Scenario: Update non-existent route
- **WHEN** user attempts to update a route that doesn't exist
- **THEN** system returns 404 status with "Route not found" error

#### Scenario: Update with invalid data
- **WHEN** user sends update with invalid field values (e.g., negative distance)
- **THEN** system returns 400 status with validation error details

#### Scenario: Unauthorized access
- **WHEN** user without routes:update permission attempts to update a route
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Delete Route
The system SHALL allow authorized users to permanently delete a route record and all associated route stops from the system.

#### Scenario: Successful deletion
- **WHEN** authorized user sends DELETE /api/v1/routes/:id with valid route ID
- **THEN** system deletes the route and all associated stops, returns 200 status with success message

#### Scenario: Delete non-existent route
- **WHEN** user attempts to delete a route that doesn't exist
- **THEN** system returns 404 status with "Route not found" error

#### Scenario: Cascade delete route stops
- **WHEN** user deletes a route that has associated stops
- **THEN** system automatically deletes all route stops associated with that route

#### Scenario: Unauthorized access
- **WHEN** user without routes:delete permission attempts to delete a route
- **THEN** system returns 403 status with "Insufficient permissions" error

#### Scenario: Unauthenticated request
- **WHEN** delete request is made without valid JWT token
- **THEN** system returns 401 status with "Not authorized" error
