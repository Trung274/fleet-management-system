## ADDED Requirements

### Requirement: Driver License Information Storage
The system SHALL store comprehensive driver license information including license number, type, and expiration date.

#### Scenario: Driver created with license information
- **WHEN** a new driver is created with licenseNumber, licenseType, and licenseExpiry
- **THEN** system stores all license information and returns driver data with license details

#### Scenario: License number uniqueness validation
- **WHEN** user attempts to create a driver with a licenseNumber that already exists
- **THEN** system returns 400 status with "Driver with this license number already exists" error

#### Scenario: License type validation
- **WHEN** user attempts to create or update driver with invalid licenseType
- **THEN** system returns 400 status with "Invalid license type" error and list of valid types

#### Scenario: License expiry date validation
- **WHEN** user attempts to create or update driver with licenseExpiry date in the past
- **THEN** system returns 400 status with "License expiry date must be in the future" error

### Requirement: Update Driver License Information
The system SHALL allow authorized users to update driver license information.

#### Scenario: Successful license information update
- **WHEN** authorized user sends PUT /api/v1/drivers/:id with updated license fields (licenseNumber, licenseType, or licenseExpiry)
- **THEN** system updates the license information and returns 200 status with updated driver data

#### Scenario: Update license number to duplicate
- **WHEN** user attempts to update licenseNumber to one that already exists for another driver
- **THEN** system returns 400 status with "License number already in use" error

#### Scenario: Update license expiry to past date
- **WHEN** user attempts to update licenseExpiry to a date in the past
- **THEN** system returns 400 status with "License expiry date must be in the future" error

#### Scenario: Unauthorized license update
- **WHEN** user without drivers:update permission attempts to update license information
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Filter Drivers by License Type
The system SHALL allow users to filter driver lists by license type.

#### Scenario: Filter by single license type
- **WHEN** user sends GET /api/v1/drivers?licenseType=Class%20A
- **THEN** system returns only drivers with licenseType "Class A"

#### Scenario: Filter by multiple license types
- **WHEN** user sends GET /api/v1/drivers?licenseType=Class%20A,Class%20B
- **THEN** system returns drivers with licenseType "Class A" OR "Class B"

#### Scenario: No drivers match license type filter
- **WHEN** user filters by a license type with no matching drivers
- **THEN** system returns 200 status with empty data array and count of 0

### Requirement: Search Drivers by License Number
The system SHALL allow users to search for drivers by license number.

#### Scenario: Search by full license number
- **WHEN** user sends GET /api/v1/drivers?search=DL123456
- **THEN** system returns drivers with licenseNumber matching "DL123456"

#### Scenario: Search by partial license number
- **WHEN** user sends GET /api/v1/drivers?search=DL123
- **THEN** system returns drivers with licenseNumber containing "DL123"

#### Scenario: Case-insensitive license search
- **WHEN** user sends GET /api/v1/drivers?search=dl123456
- **THEN** system returns drivers with licenseNumber matching "DL123456" (case-insensitive)

### Requirement: Query Drivers with Expiring Licenses
The system SHALL allow users to identify drivers with licenses expiring soon.

#### Scenario: Sort by license expiry date
- **WHEN** user sends GET /api/v1/drivers?sort=licenseExpiry
- **THEN** system returns drivers sorted by license expiry date in ascending order (soonest expiring first)

#### Scenario: Filter drivers with expired licenses
- **WHEN** user queries drivers and some have licenseExpiry dates in the past
- **THEN** system returns all drivers including those with expired licenses (no automatic filtering)
