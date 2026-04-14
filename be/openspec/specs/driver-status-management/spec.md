## ADDED Requirements

### Requirement: Driver Employment Status Tracking
The system SHALL track driver employment status with predefined status values (active, on-leave, suspended, terminated).

#### Scenario: Driver created with default status
- **WHEN** a new driver is created without specifying employmentStatus
- **THEN** system sets employmentStatus to "active" by default

#### Scenario: Driver created with explicit status
- **WHEN** a new driver is created with employmentStatus field set to "on-leave"
- **THEN** system creates driver with the specified status

#### Scenario: Invalid status value
- **WHEN** user attempts to create or update driver with invalid employmentStatus value
- **THEN** system returns 400 status with "Invalid employment status value" error and list of valid statuses

### Requirement: Update Driver Employment Status
The system SHALL allow authorized users to update driver employment status with proper validation.

#### Scenario: Successful status update
- **WHEN** authorized user sends PUT /api/v1/drivers/:id with employmentStatus field changed from "active" to "suspended"
- **THEN** system updates the driver status and returns 200 status with updated driver data

#### Scenario: Status transition validation
- **WHEN** user updates driver employmentStatus to any valid status value
- **THEN** system accepts the transition and updates the employmentStatus field

#### Scenario: Terminated driver status is permanent
- **WHEN** user attempts to change employmentStatus of a driver with status "terminated" to any other status
- **THEN** system returns 400 status with "Cannot change status of terminated driver" error

#### Scenario: Termination date automatically set
- **WHEN** user updates driver employmentStatus to "terminated"
- **THEN** system automatically sets terminationDate to current date and returns updated driver data

#### Scenario: Unauthorized status update
- **WHEN** user without drivers:update permission attempts to update driver status
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Filter Drivers by Employment Status
The system SHALL allow users to filter driver lists by employment status.

#### Scenario: Filter by single status
- **WHEN** user sends GET /api/v1/drivers?status=active
- **THEN** system returns only drivers with employmentStatus "active"

#### Scenario: Filter by multiple statuses
- **WHEN** user sends GET /api/v1/drivers?status=active,on-leave
- **THEN** system returns drivers with employmentStatus "active" OR "on-leave"

#### Scenario: No drivers match status filter
- **WHEN** user filters by a status with no matching drivers
- **THEN** system returns 200 status with empty data array and count of 0

### Requirement: Status History Tracking
The system SHALL maintain timestamps for status changes through the updatedAt field.

#### Scenario: Status change updates timestamp
- **WHEN** driver employmentStatus is updated
- **THEN** system automatically updates the updatedAt timestamp to current date/time

#### Scenario: Query recently updated drivers
- **WHEN** user sends GET /api/v1/drivers?sort=-updatedAt
- **THEN** system returns drivers sorted by most recently updated first
