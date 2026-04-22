## ADDED Requirements

### Requirement: Initialize Seats for a Trip
The system SHALL allow authorized users to generate the seat inventory for a specific trip based on the vehicle's capacity.

#### Scenario: Successful seat initialization
- **GIVEN** a trip exists with an assigned vehicle that has capacity N
- **WHEN** an authorized user sends POST /api/v1/seats/initialize with `{ tripId }`
- **THEN** the system creates N Seat documents for that trip (seatNumber 1..N, status: available) and returns 201 with the created seats

#### Scenario: Seats already initialized for trip
- **WHEN** user sends POST /api/v1/seats/initialize for a trip that already has seats
- **THEN** the system returns 400 with error "Seats already initialized for this trip"

#### Scenario: Trip not found
- **WHEN** user sends POST /api/v1/seats/initialize with a non-existent tripId
- **THEN** the system returns 404 with error "Trip not found"

#### Scenario: Unauthorized access
- **WHEN** user without seats:update permission attempts to initialize seats
- **THEN** the system returns 403 with "Insufficient permissions" error

#### Scenario: Unauthenticated request
- **WHEN** request is made without a valid JWT token
- **THEN** the system returns 401 with "Not authorized" error

---

### Requirement: Get Seat Map for a Trip
The system SHALL allow authorized users to retrieve the full seat map for a trip, showing each seat's number, type, and current status.

#### Scenario: Successful seat map retrieval
- **GIVEN** a trip with initialized seats exists
- **WHEN** authorized user sends GET /api/v1/seats?tripId=\<id\>
- **THEN** the system returns 200 with an array of all seat documents for that trip

#### Scenario: Filter by seat status
- **WHEN** user sends GET /api/v1/seats?tripId=\<id\>&status=available
- **THEN** the system returns only seats with status "available" for that trip

#### Scenario: Trip has no seats initialized
- **WHEN** user requests seat map for a trip with no seats
- **THEN** the system returns 200 with an empty array

#### Scenario: Missing tripId parameter
- **WHEN** user sends GET /api/v1/seats without tripId
- **THEN** the system returns 400 with error "tripId query parameter is required"

#### Scenario: Unauthorized access
- **WHEN** user without seats:read permission attempts to get seat map
- **THEN** the system returns 403 with "Insufficient permissions" error

---

### Requirement: Update Seat Status
The system SHALL allow authorized users to manually override a seat's status (e.g., mark a seat as unavailable for maintenance).

#### Scenario: Successful status update
- **WHEN** authorized user sends PATCH /api/v1/seats/:id with `{ status: "unavailable" }`
- **THEN** the system updates the seat and returns 200 with the updated seat document

#### Scenario: Cannot manually set booked/reserved status
- **WHEN** user attempts to set status to "reserved" or "booked" via PATCH
- **THEN** the system returns 400 with error "Cannot manually set reserved or booked status; use the booking API"

#### Scenario: Seat not found
- **WHEN** user sends PATCH /api/v1/seats/:id with a non-existent ID
- **THEN** the system returns 404 with error "Seat not found"

#### Scenario: Unauthorized access
- **WHEN** user without seats:update permission attempts the update
- **THEN** the system returns 403 with "Insufficient permissions" error
