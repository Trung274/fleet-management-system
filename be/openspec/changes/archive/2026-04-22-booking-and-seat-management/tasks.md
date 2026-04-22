## 1. Update RBAC Seed File

- [x] 1.1 Add seat permissions to seedRolesPermissions.js (seats:read, seats:update)
- [x] 1.2 Add booking permissions to seedRolesPermissions.js (bookings:create, bookings:read, bookings:update, bookings:delete)
- [x] 1.3 Update Manager role to include all seat and booking permissions
- [x] 1.4 Create new Staff role with permissions: seats:read, bookings:create, bookings:read, bookings:update (NOT seats:update, NOT bookings:delete)
- [x] 1.5 Create a default staff user account for testing: staff@example.com / Staff@123
- [x] 1.6 Run seed script to verify roles applied: npm run seed:roles

## 2. Create Seat Model

- [x] 2.1 Create src/models/Seat.model.js with Mongoose schema
- [x] 2.2 Add fields: trip (ObjectId ref Trip, required, indexed), vehicle (ObjectId ref Vehicle, required)
- [x] 2.3 Add fields: seatNumber (Number, required), type (enum: standard/window/aisle/priority, default: standard)
- [x] 2.4 Add status field (enum: available/reserved/booked/unavailable, default: available, indexed)
- [x] 2.5 Add compound unique index: { trip: 1, seatNumber: 1 }
- [x] 2.6 Add compound index: { trip: 1, status: 1 } for availability queries
- [x] 2.7 Configure timestamps: true

## 3. Create Booking Model

- [x] 3.1 Create src/models/Booking.model.js with Mongoose schema
- [x] 3.2 Add fields: trip (ObjectId ref Trip, required, indexed), seat (ObjectId ref Seat, required, indexed)
- [x] 3.3 Add embedded passenger sub-document: { name (required), phone (required), email, idNumber }
- [x] 3.4 Add status field (enum: pending/confirmed/cancelled, default: pending, indexed)
- [x] 3.5 Add fields: fare (Number), cancellationReason, bookedAt (Date), confirmedAt (Date), cancelledAt (Date)
- [x] 3.6 Add index: { 'passenger.phone': 1 } for passenger search
- [x] 3.7 Set bookedAt = Date.now in pre-save hook when status is pending and bookedAt not set
- [x] 3.8 Configure timestamps: true

## 4. Create Seat Controller

- [x] 4.1 Create src/controllers/seat.controller.js with asyncHandler wrapper
- [x] 4.2 Implement initializeSeats: find trip → populate vehicle capacity → guard duplicate init → bulkInsert N seats → return 201
- [x] 4.3 Implement getSeatMap: require tripId query → find all seats for trip → filter by status if provided → return 200
- [x] 4.4 Implement getSeatAvailability: require tripId → find trip (404 if not found) → aggregate counts by status → return summary object
- [x] 4.5 Implement updateSeat: find seat by id (404 if not found) → reject reserved/booked status via PATCH → update status → return 200

## 5. Create Booking Controller

- [x] 5.1 Create src/controllers/booking.controller.js with asyncHandler wrapper
- [x] 5.2 Implement createBooking: validate tripId/seatId exist; check trip status === 'scheduled'; atomically findOneAndUpdate seat {status:'available'} → {status:'reserved'}; if null return 409; create Booking; on failure rollback seat to available; return 201
- [x] 5.3 Implement confirmBooking: find booking by id (404); check status === 'pending' (400); set booking status to 'confirmed' + confirmedAt; set seat status to 'booked'; return 200
- [x] 5.4 Implement cancelBooking: find booking by id (404); check status !== 'cancelled' (400); set booking status to 'cancelled' + cancelledAt + reason; set seat status back to 'available'; return 200
- [x] 5.5 Implement getAllBookings: paginated list with filters (tripId, status) and search (passenger.name, passenger.phone); populate trip and seat
- [x] 5.6 Implement getBookingById: find by id, populate trip + seat + trip.route; return 404 if not found
- [x] 5.7 Implement deleteBooking: find by id (404); if not cancelled, release seat to available first; delete booking; return 200

## 6. Create Seat Routes with Swagger Documentation

- [x] 6.1 Create src/routes/seat.routes.js with Express router
- [x] 6.2 Add POST /initialize route with protect + checkPermission('seats', 'update') + initializeSeats
- [x] 6.3 Add GET / route with protect + checkPermission('seats', 'read') + getSeatMap
- [x] 6.4 Add GET /availability route (PUBLIC — no protect middleware) + getSeatAvailability
- [x] 6.5 Add PATCH /:id route with protect + checkPermission('seats', 'update') + updateSeat
- [x] 6.6 Add Swagger JSDoc for all seat endpoints (including Public tag on /availability)

## 7. Create Booking Routes with Swagger Documentation

- [x] 7.1 Create src/routes/booking.routes.js with Express router
- [x] 7.2 Add POST / route with protect + checkPermission('bookings', 'create') + createBooking
- [x] 7.3 Add GET / route with protect + checkPermission('bookings', 'read') + getAllBookings
- [x] 7.4 Add GET /:id route with protect + checkPermission('bookings', 'read') + getBookingById
- [x] 7.5 Add PATCH /:id/confirm route with protect + checkPermission('bookings', 'update') + confirmBooking
- [x] 7.6 Add PATCH /:id/cancel route with protect + checkPermission('bookings', 'update') + cancelBooking
- [x] 7.7 Add DELETE /:id route with protect + checkPermission('bookings', 'delete') + deleteBooking
- [x] 7.8 Add Swagger JSDoc for all booking endpoints (request bodies, responses, security)

## 8. Register Routes in server.js

- [x] 8.1 Add: app.use('/api/v1/seats', require('./routes/seat.routes'))
- [x] 8.2 Add: app.use('/api/v1/bookings', require('./routes/booking.routes'))

## 9. Create Seed File

- [x] 9.1 Create src/config/seedBookings.js with DB connect/disconnect
- [x] 9.2 Find first 2 existing trips from DB; skip if none found
- [x] 9.3 For each trip: delete existing seats, bulk-insert seats based on trip vehicle capacity
- [x] 9.4 Delete existing bookings; create 3–5 bookings (mix of pending/confirmed/cancelled) across the two trips
- [x] 9.5 Add npm script to package.json: "seed:bookings": "node src/config/seedBookings.js"

## 10. Write Seat API Tests

- [x] 10.1 Create src/tests/seat.api.test.js with Jest/supertest setup (admin login beforeAll)
- [x] 10.2 [Integration] Initialize seats for a trip with valid tripId — expect 201 + N seats created
- [x] 10.3 [Negative] Initialize seats for a trip that already has seats — expect 400
- [x] 10.4 [Negative] Initialize seats with non-existent tripId — expect 404
- [x] 10.5 [Integration] GET /seats?tripId=<id> — expect 200 + seat array
- [x] 10.6 [Integration] GET /seats?tripId=<id>&status=available — expect only available seats
- [x] 10.7 [Negative] GET /seats without tripId — expect 400
- [x] 10.8 [Integration] GET /seats/availability?tripId=<id> — expect 200 + summary object (Public)
- [x] 10.9 [Negative] GET /seats/availability without tripId — expect 400
- [x] 10.10 [Integration] PATCH /seats/:id with status=unavailable — expect 200
- [x] 10.11 [Negative] PATCH /seats/:id with status=reserved — expect 400
- [x] 10.12 [Negative] PATCH /seats/:nonExistentId — expect 404
- [x] 10.13 [Security] POST /initialize without auth token — expect 401
- [x] 10.14 [Security] GET /seats without auth token — expect 401
- [x] 10.15 [Performance] GET /seats for trip with 50 seats — expect 200 + count = 50

## 11. Write Booking API Tests

- [x] 11.1 Create src/tests/booking.api.test.js with Jest/supertest setup
- [x] 11.2 [Integration] POST /bookings with valid data — expect 201 + seat status changed to reserved
- [x] 11.3 [Negative] POST /bookings for already-reserved seat — expect 409
- [x] 11.4 [Negative] POST /bookings with seat from different trip — expect 400
- [x] 11.5 [Negative] POST /bookings on a cancelled trip — expect 400
- [x] 11.6 [Negative] POST /bookings without passenger.name — expect 400
- [x] 11.7 [Integration] PATCH /bookings/:id/confirm — expect 200 + seat status = booked
- [x] 11.8 [Negative] Confirm already confirmed booking — expect 400
- [x] 11.9 [Integration] PATCH /bookings/:id/cancel — expect 200 + seat status = available
- [x] 11.10 [Negative] Cancel already cancelled booking — expect 400
- [x] 11.11 [Integration] GET /bookings with pagination — expect 200 + count + data
- [x] 11.12 [Integration] GET /bookings?tripId=<id> — expect only bookings for that trip
- [x] 11.13 [Integration] GET /bookings?status=confirmed — expect only confirmed bookings
- [x] 11.14 [Integration] GET /bookings/:id — expect 200 with populated trip and seat
- [x] 11.15 [Negative] GET /bookings/:nonExistentId — expect 404
- [x] 11.16 [Security] POST /bookings without auth — expect 401
- [x] 11.17 [Security] GET /bookings without auth — expect 401
- [x] 11.18 [Security] Staff role CAN create booking — expect 201
- [x] 11.19 [Security] Staff role CANNOT initialize seats (POST /seats/initialize) — expect 403
- [x] 11.20 [Security] Staff role CANNOT delete booking (DELETE /bookings/:id) — expect 403
- [x] 11.21 [Integration] DELETE /bookings/:id — expect 200 + seat released to available
- [x] 11.22 [Performance] GET /bookings with page=1&limit=10 for 20 bookings — expect 10 results + correct pagination

## 12. Generate Test Reports

- [x] 12.1 Run npm run test:report seat-management — Report generated: docs/TEST_REPORT_SEAT-MANAGEMENT.md (14 tests: Integration, Negative, Security, Performance)
- [x] 12.2 Run npm run test:report booking-management — Report generated: docs/TEST_REPORT_BOOKING-MANAGEMENT.md (22 tests: Integration, Negative, Security, Performance)
