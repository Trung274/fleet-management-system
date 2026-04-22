## ADDED Requirements

### Requirement: Store Passenger Information
The system SHALL capture and store passenger details as part of each booking record.

#### Scenario: Booking created with full passenger info
- **WHEN** a booking is created with complete passenger details (name, phone, email, idNumber)
- **THEN** all passenger fields are persisted in the Booking document and returned in the response

#### Scenario: Booking created with minimum required passenger info
- **WHEN** a booking is created with only the required passenger fields (name, phone)
- **THEN** the booking is created successfully with optional fields (email, idNumber) omitted

#### Scenario: Missing required passenger name
- **WHEN** user sends POST /api/v1/bookings without passenger.name
- **THEN** the system returns 400 with validation error "Passenger name is required"

#### Scenario: Missing required passenger phone
- **WHEN** user sends POST /api/v1/bookings without passenger.phone
- **THEN** the system returns 400 with validation error "Passenger phone is required"

#### Scenario: Retrieve booking includes passenger info
- **WHEN** authorized user sends GET /api/v1/bookings/:id
- **THEN** the response includes the full passenger sub-document with all stored fields
