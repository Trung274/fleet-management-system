## ADDED Requirements

### Requirement: Add Stop to Route
The system SHALL allow authorized users to add a new stop to an existing route with sequence and timing information.

#### Scenario: Successful stop addition
- **WHEN** authorized user sends POST /api/v1/routes/:id/stops with valid stop data (stopName, stopCode, sequence, distanceFromStart)
- **THEN** system creates the route stop, adds it to the route's stops array, returns 201 status with created stop data

#### Scenario: Duplicate sequence in route
- **WHEN** user attempts to add a stop with a sequence number that already exists for that route
- **THEN** system returns 400 status with error message "Stop sequence already exists for this route"

#### Scenario: Invalid route ID
- **WHEN** user attempts to add a stop to a non-existent route
- **THEN** system returns 404 status with "Route not found" error

#### Scenario: Missing required fields
- **WHEN** user sends POST request without required fields (stopName, stopCode, sequence)
- **THEN** system returns 400 status with validation error details

#### Scenario: Unauthorized access
- **WHEN** user without routes:update permission attempts to add a stop
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Update Route Stop
The system SHALL allow authorized users to update existing route stop information.

#### Scenario: Successful stop update
- **WHEN** authorized user sends PUT /api/v1/routes/:id/stops/:stopId with updated fields
- **THEN** system updates the route stop and returns 200 status with updated stop data

#### Scenario: Update sequence to duplicate
- **WHEN** user attempts to update stop sequence to one that already exists for that route
- **THEN** system returns 400 status with error message "Stop sequence already exists for this route"

#### Scenario: Stop not found
- **WHEN** user attempts to update a stop that doesn't exist
- **THEN** system returns 404 status with "Route stop not found" error

#### Scenario: Stop doesn't belong to route
- **WHEN** user attempts to update a stop using wrong route ID
- **THEN** system returns 404 status with "Route stop not found for this route" error

#### Scenario: Unauthorized access
- **WHEN** user without routes:update permission attempts to update a stop
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Remove Stop from Route
The system SHALL allow authorized users to remove a stop from a route.

#### Scenario: Successful stop removal
- **WHEN** authorized user sends DELETE /api/v1/routes/:id/stops/:stopId
- **THEN** system removes the stop from route's stops array, deletes the stop record, returns 200 status with success message

#### Scenario: Stop not found
- **WHEN** user attempts to remove a stop that doesn't exist
- **THEN** system returns 404 status with "Route stop not found" error

#### Scenario: Stop doesn't belong to route
- **WHEN** user attempts to remove a stop using wrong route ID
- **THEN** system returns 404 status with "Route stop not found for this route" error

#### Scenario: Unauthorized access
- **WHEN** user without routes:update permission attempts to remove a stop
- **THEN** system returns 403 status with "Insufficient permissions" error

### Requirement: Stop Sequence Management
The system SHALL maintain proper sequencing of stops along a route.

#### Scenario: Stops returned in sequence order
- **WHEN** user retrieves a route with GET /api/v1/routes/:id
- **THEN** system returns stops array sorted by sequence in ascending order

#### Scenario: Sequence uniqueness per route
- **WHEN** multiple stops exist for a route
- **THEN** each stop has a unique sequence number within that route

#### Scenario: Sequence validation
- **WHEN** user creates or updates a stop with sequence less than 1
- **THEN** system returns 400 status with "Sequence must be greater than 0" error

### Requirement: Stop Distance Tracking
The system SHALL track distance from route start for each stop.

#### Scenario: Distance from start recorded
- **WHEN** user creates a stop with distanceFromStart value
- **THEN** system stores the distance and returns it in stop data

#### Scenario: Distance validation
- **WHEN** user creates or updates a stop with negative distanceFromStart
- **THEN** system returns 400 status with "Distance from start must be 0 or greater" error

#### Scenario: Distance ordering
- **WHEN** user retrieves route stops
- **THEN** stops with lower sequence numbers should generally have lower distanceFromStart values (not enforced, but expected)

### Requirement: Stop Timing Information
The system SHALL store estimated arrival and departure times for each stop.

#### Scenario: Timing information stored
- **WHEN** user creates a stop with estimatedArrivalTime and estimatedDepartureTime
- **THEN** system stores both values and returns them in stop data

#### Scenario: Optional timing fields
- **WHEN** user creates a stop without timing information
- **THEN** system creates the stop successfully with null timing values

#### Scenario: Timing in minutes from start
- **WHEN** timing values are provided
- **THEN** they represent minutes from route start (e.g., 15 means 15 minutes after route begins)

### Requirement: Stop Location Information
The system SHALL store location details for each stop including coordinates.

#### Scenario: Store stop address
- **WHEN** user creates a stop with address field
- **THEN** system stores the address and returns it in stop data

#### Scenario: Store stop coordinates
- **WHEN** user creates a stop with coordinates (latitude, longitude)
- **THEN** system stores the coordinates and returns them in stop data

#### Scenario: Coordinate validation
- **WHEN** user provides coordinates with latitude outside -90 to 90 range
- **THEN** system returns 400 status with "Invalid latitude value" error

#### Scenario: Coordinate validation for longitude
- **WHEN** user provides coordinates with longitude outside -180 to 180 range
- **THEN** system returns 400 status with "Invalid longitude value" error
