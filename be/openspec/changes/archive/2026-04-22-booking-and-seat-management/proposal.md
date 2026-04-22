## Why

The Bus Management System can currently schedule trips and assign vehicles/drivers, but passengers have no way to book seats on those trips. Without a booking system, there is no mechanism to:
- Reserve seats on a specific trip for a specific passenger
- Track seat availability in real time to prevent overbooking
- Store passenger information tied to a reservation
- Cancel or confirm bookings and reflect that change back to seat inventory

This module is the critical link between trip scheduling (already implemented) and customer service — without it the system has no passenger-facing functionality.

## What Changes

- Add **Seat** model to represent individual seats on a vehicle for a given trip (with status: available / reserved / booked / unavailable)
- Add **Booking** model to represent a passenger's reservation (ties together a Trip, a Seat, and passenger details)
- Create CRUD API for **seat inventory management** — initialize seats for a trip, query availability, update seat status
- Create CRUD API for **booking management** — create booking (atomically reserves seat), confirm, cancel, list, get by ID
- Add booking/seat permissions (bookings:create, bookings:read, bookings:update, bookings:delete, seats:read, seats:update)
- Assign permissions to appropriate roles (Manager: full; Staff/Driver: read; Public: view availability)
- Provide seed data with sample trips seeded with seats and a few bookings

## Capabilities

### New Capabilities
- `seat-inventory-management`: Initialize and manage seat inventory per trip; query seat map with real-time availability
- `seat-availability-tracking`: Public/protected endpoint to check available seats on a trip; filter by seat type or status
- `booking-creation-and-management`: Full booking lifecycle — create, confirm, cancel, list, get by ID; atomic seat locking to prevent double-booking
- `passenger-information-management`: Store and retrieve passenger details (name, phone, email, ID number) embedded in Booking

### Modified Capabilities
- `trip-crud` (read-only): Trip model gains a virtual `availableSeats` count derived from Seat collection; no schema change

## Impact

**New Files:**
- `src/models/Seat.model.js` — Mongoose schema for seats (trip ref, vehicle ref, seat number, type, status)
- `src/models/Booking.model.js` — Mongoose schema for bookings (trip ref, seat ref, passenger info, status, payment)
- `src/controllers/seat.controller.js` — Business logic for seat initialization and availability queries
- `src/controllers/booking.controller.js` — Business logic for full booking lifecycle
- `src/routes/seat.routes.js` — API routes with Swagger docs for seat endpoints
- `src/routes/booking.routes.js` — API routes with Swagger docs for booking endpoints
- `src/config/seedBookings.js` — Sample seat maps and bookings for development
- `src/tests/seat.api.test.js` — API test suite for seat endpoints
- `src/tests/booking.api.test.js` — API test suite for booking endpoints

**Modified Files:**
- `src/config/seedRolesPermissions.js` — Add booking and seat permissions to Manager, Staff roles
- `src/server.js` — Register seat and booking routes

**API Changes:**
- New endpoints under `/api/v1/seats` and `/api/v1/bookings`
- No breaking changes to existing APIs

**Database Changes:**
- New collections: `seats`, `bookings`
- No changes to existing collections (Trip model unchanged at schema level)

## Rollback Plan

- Remove seat and booking route registrations from `server.js`
- Drop new collections: `db.seats.drop()`, `db.bookings.drop()`
- Remove new permissions from `seedRolesPermissions.js` and re-run `npm run seed:roles`
- No changes to existing collections — zero risk to current data
