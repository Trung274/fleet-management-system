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
 *           description: Trip ID
 *         route:
 *           type: string
 *           description: Route ID reference
 *         vehicle:
 *           type: string
 *           description: Vehicle ID reference
 *         driver:
 *           type: string
 *           description: Driver ID reference
 *         scheduledDeparture:
 *           type: string
 *           format: date-time
 *           description: Scheduled departure time
 *         scheduledArrival:
 *           type: string
 *           format: date-time
 *           description: Scheduled arrival time
 *         actualDeparture:
 *           type: string
 *           format: date-time
 *           description: Actual departure time
 *         actualArrival:
 *           type: string
 *           format: date-time
 *           description: Actual arrival time
 *         status:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled, delayed]
 *           description: Trip status
 *         passengerCount:
 *           type: number
 *           description: Number of passengers
 *         fare:
 *           type: number
 *           description: Trip fare
 *         notes:
 *           type: string
 *           description: Additional notes
 *         cancellationReason:
 *           type: string
 *           description: Reason for cancellation
 *         delayReason:
 *           type: string
 *           description: Reason for delay
 *         delayDuration:
 *           type: number
 *           description: Delay duration in minutes
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/trips:
 *   post:
 *     summary: "Create a new trip (Admin, Manager)"
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
 *               vehicle:
 *                 type: string
 *               driver:
 *                 type: string
 *               scheduledDeparture:
 *                 type: string
 *                 format: date-time
 *               scheduledArrival:
 *                 type: string
 *                 format: date-time
 *               fare:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       400:
 *         description: Validation error or resource conflict
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.post('/', protect, checkPermission('trips', 'create'), createTrip);

/**
 * @swagger
 * /api/v1/trips:
 *   get:
 *     summary: "Get all trips (Authenticated)"
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: route
 *         schema:
 *           type: string
 *         description: Filter by route ID
 *       - in: query
 *         name: vehicle
 *         schema:
 *           type: string
 *         description: Filter by vehicle ID
 *       - in: query
 *         name: driver
 *         schema:
 *           type: string
 *         description: Filter by driver ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by departure date (YYYY-MM-DD)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter trips from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter trips until this date
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: "Sort field (default: -scheduledDeparture)"
 *     responses:
 *       200:
 *         description: List of trips
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, getAllTrips);

/**
 * @swagger
 * /api/v1/trips/{id}:
 *   get:
 *     summary: "Get trip by ID (Authenticated)"
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     responses:
 *       200:
 *         description: Trip details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.get('/:id', protect, getTripById);

/**
 * @swagger
 * /api/v1/trips/{id}:
 *   put:
 *     summary: "Update trip (Admin, Manager)"
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               route:
 *                 type: string
 *               vehicle:
 *                 type: string
 *               driver:
 *                 type: string
 *               scheduledDeparture:
 *                 type: string
 *                 format: date-time
 *               scheduledArrival:
 *                 type: string
 *                 format: date-time
 *               fare:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.put('/:id', protect, checkPermission('trips', 'update'), updateTrip);

/**
 * @swagger
 * /api/v1/trips/{id}:
 *   delete:
 *     summary: "Delete trip (Admin, Manager)"
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     responses:
 *       200:
 *         description: Trip deleted successfully
 *       400:
 *         description: Cannot delete non-scheduled trip
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.delete('/:id', protect, checkPermission('trips', 'delete'), deleteTrip);

/**
 * @swagger
 * /api/v1/trips/{id}/start:
 *   post:
 *     summary: "Start trip (Admin, Manager)"
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     responses:
 *       200:
 *         description: Trip started successfully
 *       400:
 *         description: Invalid status for starting
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.post('/:id/start', protect, checkPermission('trips', 'update'), startTrip);

/**
 * @swagger
 * /api/v1/trips/{id}/complete:
 *   post:
 *     summary: "Complete trip (Admin, Manager)"
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               passengerCount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Trip completed successfully
 *       400:
 *         description: Invalid status for completion
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.post('/:id/complete', protect, checkPermission('trips', 'update'), completeTrip);

/**
 * @swagger
 * /api/v1/trips/{id}/cancel:
 *   post:
 *     summary: "Cancel trip (Admin, Manager)"
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
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
 *     responses:
 *       200:
 *         description: Trip cancelled successfully
 *       400:
 *         description: Invalid status or missing reason
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.post('/:id/cancel', protect, checkPermission('trips', 'update'), cancelTrip);

/**
 * @swagger
 * /api/v1/trips/{id}/delay:
 *   post:
 *     summary: "Mark trip as delayed (Admin, Manager)"
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Trip ID
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
 *               delayDuration:
 *                 type: number
 *                 description: Delay duration in minutes
 *     responses:
 *       200:
 *         description: Trip marked as delayed
 *       400:
 *         description: Invalid status or missing data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Trip not found
 */
router.post('/:id/delay', protect, checkPermission('trips', 'update'), markTripDelayed);

module.exports = router;
