const express = require('express');
const router = express.Router();
const {
  createTrip,
  getAllTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  startTrip,
  completeTrip,
  cancelTrip,
  markTripDelayed
} = require('../controllers/trip.controller');
const { protect, checkPermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Trips
 *   description: Trip scheduling and lifecycle management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Trip:
 *       type: object
 *       required:
 *         - route
 *         - vehicle
 *         - driver
 *         - scheduledDeparture
 *         - scheduledArrival
 *       properties:
 *         _id:
 *           type: string
 *           example: "664a1f2e8b1a2c3d4e5f6a7b"
 *         route:
 *           type: object
 *           description: Populated route reference
 *           properties:
 *             _id: { type: string }
 *             name: { type: string }
 *             code: { type: string }
 *             origin: { type: string }
 *             destination: { type: string }
 *         vehicle:
 *           type: object
 *           description: Populated vehicle reference
 *           properties:
 *             _id: { type: string }
 *             registrationNumber: { type: string }
 *             make: { type: string }
 *             model: { type: string }
 *         driver:
 *           type: object
 *           description: Populated driver reference
 *           properties:
 *             _id: { type: string }
 *             firstName: { type: string }
 *             lastName: { type: string }
 *             licenseNumber: { type: string }
 *         scheduledDeparture:
 *           type: string
 *           format: date-time
 *           example: "2026-05-01T08:00:00Z"
 *         scheduledArrival:
 *           type: string
 *           format: date-time
 *           example: "2026-05-01T12:00:00Z"
 *         actualDeparture:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         actualArrival:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled, delayed]
 *           example: scheduled
 *         passengerCount:
 *           type: integer
 *           description: Final passenger count (set on completion)
 *           nullable: true
 *         fare:
 *           type: number
 *           description: Ticket price in VND
 *           example: 150000
 *         notes:
 *           type: string
 *           nullable: true
 *         cancellationReason:
 *           type: string
 *           nullable: true
 *         delayReason:
 *           type: string
 *           nullable: true
 *         delayDuration:
 *           type: integer
 *           description: Delay duration in minutes
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     TripListResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         data:
 *           type: array
 *           items: { $ref: '#/components/schemas/Trip' }
 *         pagination:
 *           type: object
 *           properties:
 *             page: { type: integer, example: 1 }
 *             limit: { type: integer, example: 10 }
 *             total: { type: integer, example: 42 }
 *             pages: { type: integer, example: 5 }
 *
 *     TripResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         data: { $ref: '#/components/schemas/Trip' }
 */

// ─── Create Trip ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/trips:
 *   post:
 *     summary: Create a new trip (Admin, Manager)
 *     description: |
 *       Schedule a new trip by assigning a route, vehicle, and driver to a time slot.
 *       The system automatically checks for **vehicle and driver conflicts** — if either
 *       is already assigned to an overlapping trip, the request will be rejected with 400.
 *
 *       **Access:** Admin, Manager
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route
 *               - vehicle
 *               - driver
 *               - scheduledDeparture
 *               - scheduledArrival
 *             properties:
 *               route:
 *                 type: string
 *                 description: Active route ID
 *                 example: "664a1f2e8b1a2c3d4e5f0001"
 *               vehicle:
 *                 type: string
 *                 description: Active vehicle ID
 *                 example: "664a1f2e8b1a2c3d4e5f0002"
 *               driver:
 *                 type: string
 *                 description: Active driver ID
 *                 example: "664a1f2e8b1a2c3d4e5f0003"
 *               scheduledDeparture:
 *                 type: string
 *                 format: date-time
 *                 description: Must be in the future
 *                 example: "2026-05-01T08:00:00Z"
 *               scheduledArrival:
 *                 type: string
 *                 format: date-time
 *                 description: Must be after scheduledDeparture
 *                 example: "2026-05-01T12:00:00Z"
 *               fare:
 *                 type: number
 *                 description: Ticket price in VND
 *                 example: 150000
 *               notes:
 *                 type: string
 *                 example: "Express service — no stops"
 *     responses:
 *       201:
 *         description: Trip created successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TripResponse' }
 *       400:
 *         description: |
 *           Validation error. Possible reasons:
 *           - Route/Vehicle/Driver not active
 *           - Departure not in future
 *           - Arrival not after departure
 *           - Vehicle or driver already booked in the time slot
 *       401:
 *         description: Unauthorized — bearer token missing or invalid
 *       403:
 *         description: Forbidden — requires `trips:create` permission (Admin, Manager)
 *       404:
 *         description: Route, Vehicle, or Driver not found
 */
router.post('/', protect, checkPermission('trips', 'create'), createTrip);

// ─── Get All Trips ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/trips:
 *   get:
 *     summary: Get all trips with pagination and filters (Admin, Manager, Staff)
 *     description: |
 *       Returns a paginated list of trips. Supports filtering by status, route, vehicle,
 *       driver, and date range.
 *
 *       **Access:** Admin, Manager, Staff
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Items per page (max 100)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled, delayed]
 *         description: Filter by trip status
 *       - in: query
 *         name: route
 *         schema: { type: string }
 *         description: Filter by route ObjectId
 *       - in: query
 *         name: vehicle
 *         schema: { type: string }
 *         description: Filter by vehicle ObjectId
 *       - in: query
 *         name: driver
 *         schema: { type: string }
 *         description: Filter by driver ObjectId
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Filter by exact departure date (YYYY-MM-DD). Overrides startDate/endDate.
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Filter trips departing from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Filter trips departing up to and including this date
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: "-scheduledDeparture" }
 *         description: Sort field. Prefix with `-` for descending. E.g. `scheduledDeparture`, `-status`
 *     responses:
 *       200:
 *         description: List of trips with pagination metadata
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TripListResponse' }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires `trips:read` permission (Admin, Manager, Staff)
 */
router.get('/', protect, checkPermission('trips', 'read'), getAllTrips);

// ─── Get Trip By ID ───────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/trips/{id}:
 *   get:
 *     summary: Get a single trip with full details (Admin, Manager, Staff)
 *     description: |
 *       Returns full trip details including nested route stops, full vehicle and driver records.
 *
 *       **Access:** Admin, Manager, Staff
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Trip ObjectId
 *         example: "664a1f2e8b1a2c3d4e5f6a7b"
 *     responses:
 *       200:
 *         description: Full trip details
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TripResponse' }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires `trips:read` permission
 *       404:
 *         description: Trip not found
 */
router.get('/:id', protect, checkPermission('trips', 'read'), getTripById);

// ─── Update Trip ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/trips/{id}:
 *   put:
 *     summary: Update trip details (Admin, Manager)
 *     description: |
 *       Update trip fields. Rules:
 *       - **Completed or cancelled trips** cannot be updated (except `notes`)
 *       - Changing `status` via PUT validates the transition. Prefer dedicated action endpoints
 *         (`/start`, `/complete`, `/cancel`, `/delay`) for status changes
 *       - Changing vehicle or driver re-checks availability for the time slot
 *       - `actualDeparture` and `actualArrival` are **read-only** — set by `/start` and `/complete`
 *
 *       **Access:** Admin, Manager
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Trip ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               route: { type: string }
 *               vehicle: { type: string }
 *               driver: { type: string }
 *               scheduledDeparture: { type: string, format: date-time }
 *               scheduledArrival: { type: string, format: date-time }
 *               fare: { type: number }
 *               notes: { type: string }
 *               status:
 *                 type: string
 *                 enum: [in-progress, completed, cancelled, delayed]
 *                 description: Use action endpoints instead when possible
 *               cancellationReason:
 *                 type: string
 *                 description: Required when status = cancelled
 *               delayReason:
 *                 type: string
 *                 description: Required when status = delayed
 *               delayDuration:
 *                 type: integer
 *                 description: Minutes of delay
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TripResponse' }
 *       400:
 *         description: |
 *           Validation error. Possible reasons:
 *           - Attempting to update a completed/cancelled trip
 *           - Invalid status transition
 *           - Missing cancellationReason or delayReason
 *           - Vehicle/driver conflict in new time slot
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires `trips:update` permission (Admin, Manager)
 *       404:
 *         description: Trip, Vehicle, or Driver not found
 */
router.put('/:id', protect, checkPermission('trips', 'update'), updateTrip);

// ─── Delete Trip ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/trips/{id}:
 *   delete:
 *     summary: Delete a trip record (Admin, Manager)
 *     description: |
 *       Hard-deletes a trip. **Only `scheduled` trips can be deleted** — trips that are
 *       in-progress, completed, or cancelled must be kept for audit purposes.
 *       Use `/cancel` to cancel a trip instead.
 *
 *       **Access:** Admin, Manager
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Trip ObjectId
 *     responses:
 *       200:
 *         description: Trip deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Trip deleted successfully" }
 *       400:
 *         description: Cannot delete — trip is not in `scheduled` status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires `trips:delete` permission (Admin, Manager)
 *       404:
 *         description: Trip not found
 */
router.delete('/:id', protect, checkPermission('trips', 'delete'), deleteTrip);

// ─── Action: Start Trip ───────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/trips/{id}/start:
 *   post:
 *     summary: Start a trip (Admin, Manager)
 *     description: |
 *       Marks a trip as `in-progress` and records `actualDeparture = now`.
 *       Only trips with status `scheduled` or `delayed` can be started.
 *
 *       **Access:** Admin, Manager
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Trip started — status is now `in-progress`
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TripResponse' }
 *       400:
 *         description: Trip is not in `scheduled` or `delayed` status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires `trips:update` permission
 *       404:
 *         description: Trip not found
 */
router.post('/:id/start', protect, checkPermission('trips', 'update'), startTrip);

// ─── Action: Complete Trip ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/trips/{id}/complete:
 *   post:
 *     summary: Complete a trip (Admin, Manager)
 *     description: |
 *       Marks an `in-progress` trip as `completed` and records `actualArrival = now`.
 *       Optionally records the final passenger count (validated against vehicle capacity).
 *
 *       **Access:** Admin, Manager
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passengerCount:
 *                 type: integer
 *                 description: Final passenger count (must not exceed vehicle capacity)
 *                 example: 35
 *               notes:
 *                 type: string
 *                 description: Optional completion notes
 *     responses:
 *       200:
 *         description: Trip completed — status is now `completed`
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TripResponse' }
 *       400:
 *         description: Trip is not `in-progress`, or passenger count exceeds capacity
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires `trips:update` permission
 *       404:
 *         description: Trip not found
 */
router.post('/:id/complete', protect, checkPermission('trips', 'update'), completeTrip);

// ─── Action: Cancel Trip ──────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/trips/{id}/cancel:
 *   post:
 *     summary: Cancel a trip (Admin, Manager)
 *     description: |
 *       Cancels a trip in any non-terminal status (`scheduled`, `delayed`, or `in-progress`).
 *       A `cancellationReason` is **required**. If the trip was `in-progress`, `actualArrival`
 *       is also set to record when it was aborted.
 *
 *       **Access:** Admin, Manager
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cancellationReason
 *             properties:
 *               cancellationReason:
 *                 type: string
 *                 example: "Vehicle mechanical failure"
 *     responses:
 *       200:
 *         description: Trip cancelled — status is now `cancelled`
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TripResponse' }
 *       400:
 *         description: Trip is already `completed` or `cancelled`, or reason is missing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires `trips:update` permission
 *       404:
 *         description: Trip not found
 */
router.post('/:id/cancel', protect, checkPermission('trips', 'update'), cancelTrip);

// ─── Action: Delay Trip ───────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/trips/{id}/delay:
 *   post:
 *     summary: Mark a trip as delayed (Admin, Manager)
 *     description: |
 *       Marks a `scheduled` trip as `delayed` and records the reason and expected duration.
 *       A delayed trip can still be started (`/start`) when it eventually departs, or cancelled.
 *
 *       **Access:** Admin, Manager
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - delayReason
 *               - delayDuration
 *             properties:
 *               delayReason:
 *                 type: string
 *                 example: "Heavy traffic on highway"
 *               delayDuration:
 *                 type: integer
 *                 description: Expected delay in minutes (must be > 0)
 *                 example: 30
 *     responses:
 *       200:
 *         description: Trip marked as delayed — status is now `delayed`
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TripResponse' }
 *       400:
 *         description: Trip is not `scheduled`, or delayReason/delayDuration missing/invalid
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — requires `trips:update` permission
 *       404:
 *         description: Trip not found
 */
router.post('/:id/delay', protect, checkPermission('trips', 'update'), markTripDelayed);

module.exports = router;
