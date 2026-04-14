## ADDED Requirements

### Requirement: Create Driver
The system SHALL allow authorized users to create a new driver record with all required driver information.

#### Scenario: Successful driver creation with valid data
- **WHEN** an authorized user sends POST /api/v1/drivers with valid driver data (firstName, lastName, email, phone, licenseNumber, licenseType, licenseExpiry)
- **THEN** system creates the driver record, returns 201 status with the created driver data

#### Scenario: Duplicate license number
- **WHEN** user attempts to create a driver with an existing licenseNumber
- **THEN** system returns 400 status with error message "Driver with this license number already exists"

#### Scenario: Duplicate email address
- **WHEN** user attempts to create a driver with an existing email
- **THEN** system returns 400 status with error message "Email already in use"

#### Scenario: Missing required fields
- **WHEN** user sends POST request without required fields (firstName, lastName, email, phone, licenseNumber, licenseType, licenseExpiry)
- **THEN** system returns 400 status with validation error details

#### Scenario: Invalid license expiry date
- **WHEN** user sends POST request with licenseExpiry date in the past
- **THEN** system returns 400 status with error message "License expiry date must be in the future"

#### Scenario: Unauthorized access
- **WHEN** user without drivers:create permission attempts to create a driver
- **THEN** system returns 403 status with "Insufficient permissions" error

#### Scenario: Unauthenticated request
- **WHEN** request is made without valid JWT token
- **THEN** system returns 401 status with "Not authorized" error

### Requirement: List All Drivers
The system SHALL allow authorized users to retrieve a paginated list of all drivers with filtering and sorting capabilities.

#### Scenario: Successful retrieval with pagination
- **WHEN** authorized user sends GET /api/v1/drivers with query params (page, limit, sort)
- **THEN** system returns 200 status with paginated driver list, total count, and pagination metadata

#### Scenario: Filter by employment status
- **WHEN** user sends GET /api/v1/drivers?status=active
- **THEN** system returns only drivers with employmentStatus "active"

#### Scenario: Filter by license type
- **WHEN** user sends GET /api/v1/drivers?licenseType=Class%20A
- **THEN** system returns only drivers with licenseType "Class A"

#### Scenario: Search by name or license
- **WHEN** user sends GET /api/v1/drivers?search=John
- **THEN** system returns drivers matching the search term in firstName, lastName, email, or licenseNumber fields

#### Scenario: Sort by field
- **WHEN** user sends GET /api/v1/drivers?sort=-createdAt
- **THEN** system returns drivers sorted by creation date in descending order

#### Scenario: Unauthorized access
- **WHEN** user without drivers:read permission attempts to list drivers
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Get Single Driver
The system SHALL allow authorized users to retrieve detailed information about a specific driver by ID.

#### Scenario: Successful retrieval by valid ID
- **WHEN** authorized user sends GET /api/v1/drivers/:id with valid driver ID
- **THEN** system returns 200 status with complete driver details including emergencyContact

#### Scenario: Driver not found
- **WHEN** user requests a driver with non-existent ID
- **THEN** system returns 404 status with "Driver not found" error

#### Scenario: Invalid ID format
- **WHEN** user sends request with invalid MongoDB ObjectId format
- **THEN** system returns 404 status with "Driver not found" error

#### Scenario: Unauthorized access
- **WHEN** user without drivers:read permission attempts to get driver details
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Update Driver
The system SHALL allow authorized users to update existing driver information with partial or complete data.

#### Scenario: Successful update with valid data
- **WHEN** authorized user sends PUT /api/v1/drivers/:id with updated fields
- **THEN** system updates the driver record and returns 200 status with updated driver data

#### Scenario: Update with duplicate license number
- **WHEN** user attempts to update licenseNumber to one that already exists
- **THEN** system returns 400 status with "License number already in use" error

#### Scenario: Update with duplicate email
- **WHEN** user attempts to update email to one that already exists
- **THEN** system returns 400 status with "Email already in use" error

#### Scenario: Update non-existent driver
- **WHEN** user attempts to update a driver that doesn't exist
- **THEN** system returns 404 status with "Driver not found" error

#### Scenario: Update with invalid data
- **WHEN** user sends update with invalid field values (e.g., past license expiry date)
- **THEN** system returns 400 status with validation error details

#### Scenario: Unauthorized access
- **WHEN** user without drivers:update permission attempts to update a driver
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Delete Driver
The system SHALL allow authorized users to permanently delete a driver record from the system.

#### Scenario: Successful deletion
- **WHEN** authorized user sends DELETE /api/v1/drivers/:id with valid driver ID
- **THEN** system deletes the driver and returns 200 status with success message

#### Scenario: Delete non-existent driver
- **WHEN** user attempts to delete a driver that doesn't exist
- **THEN** system returns 404 status with "Driver not found" error

#### Scenario: Unauthorized access
- **WHEN** user without drivers:delete permission attempts to delete a driver
- **THEN** system returns 403 status with "Insufficient permissions" error

#### Scenario: Unauthenticated request
- **WHEN** delete request is made without valid JWT token
- **THEN** system returns 401 status with "Not authorized" error
