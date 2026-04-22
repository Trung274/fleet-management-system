## ADDED Requirements

### Requirement: Check Seat Availability (Public)
The system SHALL allow any user (including unauthenticated) to check how many and which seats are available on a specific trip.

#### Scenario: Successful availability check
- **WHEN** any user sends GET /api/v1/seats/availability?tripId=\<id\>
- **THEN** the system returns 200 with `{ tripId, totalSeats, availableSeats, reservedSeats, bookedSeats, unavailableSeats, seats: [...] }`

#### Scenario: No seats initialized for trip
- **WHEN** user checks availability for a trip with no initialized seat map
- **THEN** the system returns 200 with all counts as 0 and empty seats array

#### Scenario: Missing tripId parameter
- **WHEN** user sends GET /api/v1/seats/availability without tripId
- **THEN** the system returns 400 with error "tripId query parameter is required"

#### Scenario: Trip not found
- **WHEN** user sends GET /api/v1/seats/availability with a non-existent tripId
- **THEN** the system returns 404 with error "Trip not found"
