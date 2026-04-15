## ADDED Requirements

### Requirement: Route Operational Status Tracking
The system SHALL track route operational status with predefined status values (active, inactive, under-maintenance, discontinued).

#### Scenario: Route created with default status
- **WHEN** a new route is created without specifying status
- **THEN** system sets status to "active" by default

#### Scenario: Route created with explicit status
- **WHEN** a new route is created with status field set to "inactive"
- **THEN** system creates route with the specified status

#### Scenario: Invalid status value
- **WHEN** user attempts to create or update route with invalid status value
- **THEN** system returns 400 status with "Invalid status value" error and list of valid statuses

### Requirement: Update Route Operational Status
The system SHALL allow authorized users to update route operational status with proper validation.

#### Scenario: Successful status update
- **WHEN** authorized user sends PUT /api/v1/routes/:id with status field changed from "active" to "under-maintenance"
- **THEN** system updates the route status and returns 200 status with updated route data

#### Scenario: Status transition validation
- **WHEN** user updates route status to any valid status value
- **THEN** system accepts the transition and updates the status field

#### Scenario: Discontinued route status is permanent
- **WHEN** user attempts to change status of a route with status "discontinued" to any other status
- **THEN** system returns 400 status with "Cannot change status of discontinued route" error

#### Scenario: Discontinued date automatically set
- **WHEN** user updates route status to "discontinued"
- **THEN** system automatically sets discontinuedDate to current date and returns updated route data

#### Scenario: Unauthorized status update
- **WHEN** user without routes:update permission attempts to update route status
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Filter Routes by Operational Status
The system SHALL allow users to filter route lists by operational status.

#### Scenario: Filter by single status
- **WHEN** user sends GET /api/v1/routes?status=active
- **THEN** system returns only routes with status "active"

#### Scenario: Filter by multiple statuses
- **WHEN** user sends GET /api/v1/routes?status=active,inactive
- **THEN** system returns routes with status "active" OR "inactive"

#### Scenario: No routes match status filter
- **WHEN** user filters by a status with no matching routes
- **THEN** system returns 200 status with empty data array and count of 0

### Requirement: Status History Tracking
The system SHALL maintain timestamps for status changes through the updatedAt field.

#### Scenario: Status change updates timestamp
- **WHEN** route status is updated
- **THEN** system automatically updates the updatedAt timestamp to current date/time

#### Scenario: Query recently updated routes
- **WHEN** user sends GET /api/v1/routes?sort=-updatedAt
- **THEN** system returns routes sorted by most recently updated first

### Requirement: Service Type Classification
The system SHALL classify routes by service type (express, local, shuttle).

#### Scenario: Route created with service type
- **WHEN** a new route is created with serviceType field
- **THEN** system stores the service type and returns it in route data

#### Scenario: Default service type
- **WHEN** a new route is created without specifying serviceType
- **THEN** system sets serviceType to "local" by default

#### Scenario: Invalid service type
- **WHEN** user attempts to create or update route with invalid serviceType value
- **THEN** system returns 400 status with "Invalid service type" error and list of valid types

#### Scenario: Filter by service type
- **WHEN** user sends GET /api/v1/routes?serviceType=express
- **THEN** system returns only routes with serviceType "express"

### Requirement: Route Lifecycle Management
The system SHALL support complete lifecycle from creation to discontinuation.

#### Scenario: New route starts active
- **WHEN** a new route is created
- **THEN** system sets status to "active" and route is available for operations

#### Scenario: Temporary inactivation
- **WHEN** route status is changed to "inactive"
- **THEN** route can be reactivated later by changing status back to "active"

#### Scenario: Maintenance period
- **WHEN** route status is changed to "under-maintenance"
- **THEN** route can return to "active" status after maintenance is complete

#### Scenario: Permanent discontinuation
- **WHEN** route status is changed to "discontinued"
- **THEN** route cannot be reactivated and discontinuedDate is permanently recorded
