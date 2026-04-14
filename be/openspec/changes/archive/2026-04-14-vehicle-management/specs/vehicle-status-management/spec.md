## ADDED Requirements

### Requirement: Vehicle Status Tracking
The system SHALL track vehicle operational status with predefined status values (active, maintenance, out-of-service, retired).

#### Scenario: Vehicle created with default status
- **WHEN** a new vehicle is created without specifying status
- **THEN** system sets status to "active" by default

#### Scenario: Vehicle created with explicit status
- **WHEN** a new vehicle is created with status field set to "maintenance"
- **THEN** system creates vehicle with the specified status

#### Scenario: Invalid status value
- **WHEN** user attempts to create or update vehicle with invalid status value
- **THEN** system returns 400 status with "Invalid status value" error and list of valid statuses

### Requirement: Update Vehicle Status
The system SHALL allow authorized users to update vehicle operational status with proper validation.

#### Scenario: Successful status update
- **WHEN** authorized user sends PUT /api/v1/vehicles/:id with status field changed from "active" to "maintenance"
- **THEN** system updates the vehicle status and returns 200 status with updated vehicle data

#### Scenario: Status transition validation
- **WHEN** user updates vehicle status to any valid status value
- **THEN** system accepts the transition and updates the status field

#### Scenario: Retired vehicle status is permanent
- **WHEN** user attempts to change status of a vehicle with status "retired" to any other status
- **THEN** system returns 400 status with "Cannot change status of retired vehicle" error

#### Scenario: Unauthorized status update
- **WHEN** user without vehicles:update permission attempts to update vehicle status
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Filter Vehicles by Status
The system SHALL allow users to filter vehicle lists by operational status.

#### Scenario: Filter by single status
- **WHEN** user sends GET /api/v1/vehicles?status=active
- **THEN** system returns only vehicles with status "active"

#### Scenario: Filter by multiple statuses
- **WHEN** user sends GET /api/v1/vehicles?status=active,maintenance
- **THEN** system returns vehicles with status "active" OR "maintenance"

#### Scenario: No vehicles match status filter
- **WHEN** user filters by a status with no matching vehicles
- **THEN** system returns 200 status with empty data array and count of 0

### Requirement: Status History Tracking
The system SHALL maintain timestamps for status changes through the updatedAt field.

#### Scenario: Status change updates timestamp
- **WHEN** vehicle status is updated
- **THEN** system automatically updates the updatedAt timestamp to current date/time

#### Scenario: Query recently updated vehicles
- **WHEN** user sends GET /api/v1/vehicles?sort=-updatedAt
- **THEN** system returns vehicles sorted by most recently updated first
