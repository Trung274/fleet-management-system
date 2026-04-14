## ADDED Requirements

### Requirement: Create Vehicle
The system SHALL allow authorized users to create a new vehicle record with all required vehicle information.

#### Scenario: Successful vehicle creation with valid data
- **WHEN** an authorized user sends POST /api/v1/vehicles with valid vehicle data (registrationNumber, make, model, year, capacity, status)
- **THEN** system creates the vehicle record, returns 201 status with the created vehicle data

#### Scenario: Duplicate registration number
- **WHEN** user attempts to create a vehicle with an existing registrationNumber
- **THEN** system returns 400 status with error message "Vehicle with this registration number already exists"

#### Scenario: Missing required fields
- **WHEN** user sends POST request without required fields (registrationNumber, make, model, capacity)
- **THEN** system returns 400 status with validation error details

#### Scenario: Unauthorized access
- **WHEN** user without vehicles:create permission attempts to create a vehicle
- **THEN** system returns 403 status with "Insufficient permissions" error

#### Scenario: Unauthenticated request
- **WHEN** request is made without valid JWT token
- **THEN** system returns 401 status with "Not authorized" error

### Requirement: List All Vehicles
The system SHALL allow authorized users to retrieve a paginated list of all vehicles with filtering and sorting capabilities.

#### Scenario: Successful retrieval with pagination
- **WHEN** authorized user sends GET /api/v1/vehicles with query params (page, limit, sort)
- **THEN** system returns 200 status with paginated vehicle list, total count, and pagination metadata

#### Scenario: Filter by status
- **WHEN** user sends GET /api/v1/vehicles?status=active
- **THEN** system returns only vehicles with status "active"

#### Scenario: Search by registration or make
- **WHEN** user sends GET /api/v1/vehicles?search=ABC123
- **THEN** system returns vehicles matching the search term in registrationNumber or make fields

#### Scenario: Sort by field
- **WHEN** user sends GET /api/v1/vehicles?sort=-createdAt
- **THEN** system returns vehicles sorted by creation date in descending order

#### Scenario: Unauthorized access
- **WHEN** user without vehicles:read permission attempts to list vehicles
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Get Single Vehicle
The system SHALL allow authorized users to retrieve detailed information about a specific vehicle by ID.

#### Scenario: Successful retrieval by valid ID
- **WHEN** authorized user sends GET /api/v1/vehicles/:id with valid vehicle ID
- **THEN** system returns 200 status with complete vehicle details

#### Scenario: Vehicle not found
- **WHEN** user requests a vehicle with non-existent ID
- **THEN** system returns 404 status with "Vehicle not found" error

#### Scenario: Invalid ID format
- **WHEN** user sends request with invalid MongoDB ObjectId format
- **THEN** system returns 404 status with "Vehicle not found" error

#### Scenario: Unauthorized access
- **WHEN** user without vehicles:read permission attempts to get vehicle details
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Update Vehicle
The system SHALL allow authorized users to update existing vehicle information with partial or complete data.

#### Scenario: Successful update with valid data
- **WHEN** authorized user sends PUT /api/v1/vehicles/:id with updated fields
- **THEN** system updates the vehicle record and returns 200 status with updated vehicle data

#### Scenario: Update with duplicate registration number
- **WHEN** user attempts to update registrationNumber to one that already exists
- **THEN** system returns 400 status with "Registration number already in use" error

#### Scenario: Update non-existent vehicle
- **WHEN** user attempts to update a vehicle that doesn't exist
- **THEN** system returns 404 status with "Vehicle not found" error

#### Scenario: Update with invalid data
- **WHEN** user sends update with invalid field values (e.g., negative capacity)
- **THEN** system returns 400 status with validation error details

#### Scenario: Unauthorized access
- **WHEN** user without vehicles:update permission attempts to update a vehicle
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Delete Vehicle
The system SHALL allow authorized users to permanently delete a vehicle record from the system.

#### Scenario: Successful deletion
- **WHEN** authorized user sends DELETE /api/v1/vehicles/:id with valid vehicle ID
- **THEN** system deletes the vehicle and returns 200 status with success message

#### Scenario: Delete non-existent vehicle
- **WHEN** user attempts to delete a vehicle that doesn't exist
- **THEN** system returns 404 status with "Vehicle not found" error

#### Scenario: Unauthorized access
- **WHEN** user without vehicles:delete permission attempts to delete a vehicle
- **THEN** system returns 403 status with "Insufficient permissions" error

#### Scenario: Unauthenticated request
- **WHEN** delete request is made without valid JWT token
- **THEN** system returns 401 status with "Not authorized" error
