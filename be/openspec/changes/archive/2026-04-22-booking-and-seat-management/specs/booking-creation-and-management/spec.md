## ADDED Requirements

### Requirement: Create Booking
The system SHALL allow authorized users to create a booking that atomically reserves a specific seat on a trip for a passenger.

#### Scenario: Successful booking creation
- **GIVEN** a trip exists with at least one available seat
- **WHEN** authorized user sends POST /api/v1/bookings with `{ tripId, seatId, passenger: { name, phone, email, idNumber }, fare }`
- **THEN** the system atomically sets the seat status to "reserved", creates the Booking document with status "pending", returns 201 with the booking

#### Scenario: Seat not available
- **WHEN** user attempts to book a seat that is already reserved, booked, or unavailable
- **THEN** the system returns 409 with error "Seat is not available for booking"

#### Scenario: Seat does not belong to the specified trip
- **WHEN** user sends a bookings request with a seatId that belongs to a different trip
- **THEN** the system returns 400 with error "Seat does not belong to the specified trip"

#### Scenario: Trip is not in scheduled status
- **WHEN** user attempts to book a seat on a cancelled or completed trip
- **THEN** the system returns 400 with error "Cannot book seats on a trip that is not scheduled"

#### Scenario: Missing required fields
- **WHEN** user sends POST /api/v1/bookings without tripId, seatId, or passenger.name
- **THEN** the system returns 400 with validation error details

#### Scenario: Unauthenticated request
- **WHEN** POST /api/v1/bookings is called without a JWT token
- **THEN** the system returns 401 with "Not authorized" error

#### Scenario: Unauthorized access
- **WHEN** user without bookings:create permission calls POST /api/v1/bookings
- **THEN** the system returns 403 with "Insufficient permissions" error

---

### Requirement: Confirm Booking
The system SHALL allow authorized users to confirm a pending booking, changing the seat status to "booked".

#### Scenario: Successful confirmation
- **GIVEN** a booking with status "pending" exists
- **WHEN** authorized user sends PATCH /api/v1/bookings/:id/confirm
- **THEN** the system sets booking status to "confirmed", seat status to "booked", returns 200 with updated booking

#### Scenario: Booking is not in pending status
- **WHEN** user attempts to confirm a booking that is already confirmed or cancelled
- **THEN** the system returns 400 with error "Only pending bookings can be confirmed"

#### Scenario: Booking not found
- **WHEN** user sends PATCH /api/v1/bookings/:id/confirm with a non-existent ID
- **THEN** the system returns 404 with error "Booking not found"

#### Scenario: Unauthorized access
- **WHEN** user without bookings:update permission attempts to confirm a booking
- **THEN** the system returns 403 with "Insufficient permissions" error

---

### Requirement: Cancel Booking
The system SHALL allow authorized users to cancel a booking, releasing the associated seat back to available status.

#### Scenario: Successful cancellation
- **GIVEN** a booking with status "pending" or "confirmed" exists
- **WHEN** authorized user sends PATCH /api/v1/bookings/:id/cancel with optional `{ reason }`
- **THEN** the system sets booking status to "cancelled", seat status back to "available", returns 200 with updated booking

#### Scenario: Cannot cancel already cancelled booking
- **WHEN** user attempts to cancel a booking that is already cancelled
- **THEN** the system returns 400 with error "Booking is already cancelled"

#### Scenario: Booking not found
- **WHEN** user sends PATCH /api/v1/bookings/:id/cancel with a non-existent ID
- **THEN** the system returns 404 with error "Booking not found"

#### Scenario: Unauthorized access
- **WHEN** user without bookings:update permission attempts to cancel
- **THEN** the system returns 403 with "Insufficient permissions" error

---

### Requirement: List Bookings
The system SHALL allow authorized users to retrieve a paginated list of all bookings with filtering by trip, status, or passenger.

#### Scenario: Successful retrieval with pagination
- **WHEN** authorized user sends GET /api/v1/bookings with query params (page, limit)
- **THEN** the system returns 200 with paginated booking list, total count, and pagination metadata

#### Scenario: Filter by tripId
- **WHEN** user sends GET /api/v1/bookings?tripId=\<id\>
- **THEN** the system returns only bookings for that trip

#### Scenario: Filter by status
- **WHEN** user sends GET /api/v1/bookings?status=confirmed
- **THEN** the system returns only confirmed bookings

#### Scenario: Search by passenger name or phone
- **WHEN** user sends GET /api/v1/bookings?search=Nguyen
- **THEN** the system returns bookings where passenger name or phone contains "Nguyen"

#### Scenario: Unauthorized access
- **WHEN** user without bookings:read permission attempts to list bookings
- **THEN** the system returns 403 with "Insufficient permissions" error

---

### Requirement: Get Single Booking
The system SHALL allow authorized users to retrieve full details of a specific booking, including populated trip, seat, and passenger info.

#### Scenario: Successful retrieval
- **WHEN** authorized user sends GET /api/v1/bookings/:id with a valid booking ID
- **THEN** the system returns 200 with complete booking details (trip, seat, passenger info all populated)

#### Scenario: Booking not found
- **WHEN** user requests a booking with a non-existent ID
- **THEN** the system returns 404 with error "Booking not found"

#### Scenario: Invalid ID format
- **WHEN** user sends a request with an invalid MongoDB ObjectId
- **THEN** the system returns 404 with error "Booking not found"

#### Scenario: Unauthorized access
- **WHEN** user without bookings:read permission attempts to get booking details
- **THEN** the system returns 403 with "Insufficient permissions" error
