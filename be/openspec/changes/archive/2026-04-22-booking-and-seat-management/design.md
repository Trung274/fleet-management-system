## Context

The Bus Management System currently manages trips (with assigned vehicles, drivers, and routes) but has no passenger-facing layer. This design adds a complete seat and booking module on top of the existing Trip + Vehicle infrastructure.

**Current State:**
- Trip model: route, vehicle, driver, scheduledDeparture, scheduledArrival, status, fare, passengerCount
- Vehicle model: registrationNumber, capacity, status
- RBAC: checkPermission middleware, Manager and Admin roles

**Constraints:**
- Must be atomic: seat status and booking creation must succeed or fail together (use Mongoose transactions or findOneAndUpdate with condition)
- Must not modify existing Trip or Vehicle schemas (backward compatible)
- Must follow asyncHandler / ErrorResponse / Swagger patterns
- Double-booking must be impossible even under concurrent requests

## Goals / Non-Goals

**Goals:**
- Initialize seat inventory per trip from vehicle capacity
- Real-time seat availability query (public endpoint)
- Full booking lifecycle: create (pending) → confirm (booked) → cancel (available)
- Embedded passenger info per booking
- Paginated listing with filters for bookings
- Seed data with seats + bookings referencing existing trip data
- 15–20 tests per domain (seat, booking), plus generated test reports

**Non-Goals:**
- Online payment processing
- Email/SMS confirmation notifications
- QR code ticket generation
- Waiting-list / overbooking management
- Multi-seat booking in one request (book one seat per booking)

## Decisions

### 1. Seat Model Design

**Decision:** Separate `Seat` collection keyed by (trip, seatNumber).

**Seat Model Fields:**
- `trip` — ObjectId ref to `Trip` (required, indexed)
- `vehicle` — ObjectId ref to `Vehicle` (required, for denormalization; avoids extra populate on vehicle lookup)
- `seatNumber` — Number (1-based, required)
- `type` — String enum: `standard` | `window` | `aisle` | `priority` (default: `standard`)
- `status` — String enum: `available` | `reserved` | `booked` | `unavailable` (default: `available`, indexed)
- Timestamps: createdAt, updatedAt

**Indexes:**
- Compound unique: `{ trip: 1, seatNumber: 1 }`
- `{ trip: 1, status: 1 }` for availability queries

**Rationale:**
- Separate collection scales well (100-seat vehicle × many trips)
- Compound unique index prevents duplicate seat numbers per trip
- Denormalized vehicle ref avoids extra populate when initializing

### 2. Booking Model Design

**Decision:** `Booking` embeds passenger as a sub-document; references trip and seat.

**Booking Model Fields:**
- `trip` — ObjectId ref to `Trip` (required, indexed)
- `seat` — ObjectId ref to `Seat` (required, unique — one booking per seat)
- `passenger` — Embedded object:
  - `name` — String (required)
  - `phone` — String (required)
  - `email` — String (optional)
  - `idNumber` — String (optional, national ID or passport)
- `status` — String enum: `pending` | `confirmed` | `cancelled` (default: `pending`, indexed)
- `fare` — Number (optional, copied from trip if not supplied)
- `cancellationReason` — String (optional, set on cancel)
- `bookedAt` — Date (set on creation)
- `confirmedAt` — Date (set on confirm)
- `cancelledAt` — Date (set on cancel)
- Timestamps: createdAt, updatedAt

**Indexes:**
- `{ trip: 1 }`, `{ seat: 1 }` (sparse unique — enforced at app layer for cancelled bookings)
- `{ status: 1 }`
- `{ 'passenger.phone': 1 }` for passenger search

**Rationale:**
- Embedding passenger avoids a separate Passenger collection for this scope
- `seat` unique index prevents double-booking at DB level
- Status timestamps provide audit trail without full event sourcing

### 3. Atomic Seat Reservation Strategy

**Decision:** Use `findOneAndUpdate` with a conditional `{ status: 'available' }` filter to atomically flip seat to `reserved` when creating a booking.

**Flow:**
```
POST /api/v1/bookings
  1. Validate trip exists and status === 'scheduled'
  2. findOneAndUpdate(
       { _id: seatId, trip: tripId, status: 'available' },
       { $set: { status: 'reserved' } },
       { new: true }
     )
     → if null returned → seat not available → 409
  3. Create Booking doc { seat, trip, passenger, status: 'pending', ... }
     → if Booking creation fails → rollback: set seat back to 'available'
  4. Return 201
```

**Rationale:**
- `findOneAndUpdate` with a condition is atomic at MongoDB level — no separate lock needed
- Avoids Mongoose transactions (which require replica sets) for simpler deployment
- Manual rollback on booking creation failure is acceptable for this scope

### 4. Permission Structure

**Decision:** Resource-based permissions following project convention.

**Permissions:**
- `seats:read` — View seat maps and availability
- `seats:update` — Initialize seats for a trip, manually update seat status
- `bookings:create` — Create new bookings
- `bookings:read` — List and view bookings
- `bookings:update` — Confirm or cancel bookings
- `bookings:delete` — Hard delete a booking record (admin only)

**Role Assignment:**

| Permission | Admin | Manager | Staff | User |
|-----------|-------|---------|-------|------|
| seats:read | ✓ (auto) | ✓ | ✓ | — |
| seats:update (init + override) | ✓ (auto) | ✓ | — | — |
| bookings:create | ✓ (auto) | ✓ | ✓ | — |
| bookings:read | ✓ (auto) | ✓ | ✓ | — |
| bookings:update (confirm/cancel) | ✓ (auto) | ✓ | ✓ | — |
| bookings:delete | ✓ (auto) | ✓ | — | — |

**Staff role rationale:** Nhân viên quầy vé cần tạo/xem/xác nhận/hủy booking và xem sơ đồ ghế, nhưng không cần khởi tạo seat inventory (nghiệp vụ của Manager) hoặc xóa cứng booking (admin operation).

**Note:** `staff` là role mới cần thêm vào `seedRolesPermissions.js`. Hiện tại hệ thống chỉ có: admin, manager, user.

**Public endpoint** (no protect middleware):
- `GET /api/v1/seats/availability` — anyone can check availability

### 5. API Endpoint Design

**Seat Endpoints** (`/api/v1/seats`):

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | /api/v1/seats/initialize | seats:update | Initialize seats for a trip |
| GET | /api/v1/seats | seats:read | Get seat map for a trip (tripId query param) |
| GET | /api/v1/seats/availability | Public | Check availability summary for a trip |
| PATCH | /api/v1/seats/:id | seats:update | Manually update a single seat status |

**Booking Endpoints** (`/api/v1/bookings`):

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | /api/v1/bookings | bookings:create | Create booking (reserves seat atomically) |
| GET | /api/v1/bookings | bookings:read | List bookings (paginated, filtered) |
| GET | /api/v1/bookings/:id | bookings:read | Get single booking (populated) |
| PATCH | /api/v1/bookings/:id/confirm | bookings:update | Confirm pending booking |
| PATCH | /api/v1/bookings/:id/cancel | bookings:update | Cancel booking and release seat |
| DELETE | /api/v1/bookings/:id | bookings:delete | Hard delete a booking record |

**Query Parameters for GET /bookings:**
- `page`, `limit` — Pagination
- `sort` — Sort field (e.g. `-bookedAt`)
- `tripId` — Filter by trip
- `status` — Filter by booking status
- `search` — Search passenger name or phone

### 6. Seat Initialization Strategy

On `POST /api/v1/seats/initialize { tripId }`:
1. Find trip, populate vehicle to get `capacity`
2. Check no seats exist for this trip already
3. Bulk insert N Seat documents (seatNumber 1..N, type: standard, status: available, trip, vehicle)
4. Return created seats array

**Rationale:**
- Bulk insert is fast and atomic at collection level via `insertMany`
- Idempotent guard (check existing) prevents duplicate initialization

### 7. Seed Data Strategy

**File:** `src/config/seedBookings.js`
- Connect to DB
- Find first 2 existing trips (from previously seeded trip data)
- Initialize seats for each trip (call initializeSeat logic directly, not via HTTP)
- Create 3–5 sample bookings across those trips (mix of pending, confirmed, cancelled)
- Idempotent: drop and recreate seats + bookings each run
- Add npm script: `"seed:bookings": "node src/config/seedBookings.js"`

### 8. Testing Approach

**Seat Tests** (`seat.api.test.js`): 15 tests
- Integration (40%): initialize seats, get seat map, availability check, update seat status
- Negative (30%): duplicate initialization, missing tripId, invalid seat status values
- Security (20%): auth required, permission checks
- Performance (10%): seat map for large vehicle (50 seats)

**Booking Tests** (`booking.api.test.js`): 15–20 tests
- Integration (40%): create booking, confirm, cancel, list, get by ID
- Negative (30%): book unavailable seat, wrong trip, cancelled trip, missing fields
- Security (20%): auth required, permission checks
- Performance (10%): paginated list with many bookings

## Risks / Trade-offs

**[Risk]** No database transactions — rollback on booking failure is manual
→ **Mitigation:** Atomic seat lock via findOneAndUpdate + try/catch rollback; acceptable for current scale

**[Risk]** Cancelled bookings leave `seat` field not truly unique (two cancelled + one active)
→ **Mitigation:** Unique constraint enforced at app layer only for non-cancelled bookings; add sparse compound index `{ seat: 1, status: 1 }` filtered to active statuses if needed

**[Risk]** No passenger authentication — anyone with staff credentials can book for any passenger
→ **Mitigation:** Acceptable for internal fleet management tool; passenger self-service is out of scope

**[Trade-off]** Embedded passenger vs separate Passenger collection
→ **Decision:** Embedded — simpler schema, no join, sufficient for this scope; can be extracted later

**[Trade-off]** Manual seat initialization vs auto-init on trip creation
→ **Decision:** Manual initialization — decouples trip management from seat management, gives operators control over when to open bookings

## Migration Plan

**Deployment Steps:**
1. Deploy new files (models, controllers, routes)
2. Run `npm run seed:roles` to add seat/booking permissions + create Staff role for Manager and Staff
3. Run `npm run seed:bookings` to populate sample seat maps and bookings
4. Verify Swagger docs at /api-docs
5. Run `npm test -- seat.api.test.js booking.api.test.js`
6. Generate reports: `npm run test:report seat-management` and `npm run test:report booking-management`

**Rollback:**
- Remove route registrations from server.js
- `db.seats.drop()` and `db.bookings.drop()`
- Re-run `npm run seed:roles` after removing new permissions from seed file
- No impact on existing trips, vehicles, drivers, routes

## Open Questions

None — design is complete and ready for implementation.
