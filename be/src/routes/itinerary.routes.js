const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/auth');
const {
  createItinerary,
  confirmItinerary,
  cancelItinerary,
  getAllItineraries,
  getItineraryById
} = require('../controllers/itinerary.controller');

/**
 * @swagger
 * tags:
 *   name: Itineraries
 *   description: Multi-trip journeys (one passenger, several connecting trips)
 */

/**
 * @swagger
 * /itineraries:
 *   post:
 *     summary: Create a multi-trip itinerary and reserve one seat per leg (Manager, Staff)
 *     description: |
 *       All seats are reserved in a single transaction — if any leg fails, nothing is reserved.
 *       Each leg must start at the previous leg's destination, with at least
 *       MIN_TRANSFER_MINUTES (default 30) between arrival and next departure.
 *     tags: [Itineraries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passenger
 *               - legs
 *             properties:
 *               passenger:
 *                 type: object
 *                 required:
 *                   - name
 *                   - phone
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Nguyen Van A"
 *                   phone:
 *                     type: string
 *                     example: "0901234567"
 *                   email:
 *                     type: string
 *                     example: "van.a@example.com"
 *                   idNumber:
 *                     type: string
 *                     example: "012345678901"
 *               legs:
 *                 type: array
 *                 minItems: 2
 *                 description: Trips in travel order
 *                 items:
 *                   type: object
 *                   required:
 *                     - tripId
 *                     - seatId
 *                   properties:
 *                     tripId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     seatId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439012"
 *                     fare:
 *                       type: number
 *                       example: 150000
 *     responses:
 *       201:
 *         description: Itinerary created — all seats reserved (status pending)
 *       400:
 *         description: Fewer than 2 legs, legs do not connect, not enough transfer time, or trip not schedulable
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Trip or seat not found
 *       409:
 *         description: A seat is not available — no seat was reserved
 */
router.post('/', protect, checkPermission('bookings', 'create'), createItinerary);

/**
 * @swagger
 * /itineraries:
 *   get:
 *     summary: Get all itineraries (paginated)
 *     tags: [Itineraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by passenger name or phone
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of itineraries
 *       401:
 *         description: Not authorized
 */
router.get('/', protect, checkPermission('bookings', 'read'), getAllItineraries);

/**
 * @swagger
 * /itineraries/{id}:
 *   get:
 *     summary: Get an itinerary with every leg and current connection status
 *     description: |
 *       `connections` re-checks each transfer against current trip times (delays, cancellations).
 *       `atRisk` is true when any connection is no longer feasible.
 *     tags: [Itineraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Itinerary details
 *       404:
 *         description: Itinerary not found
 */
router.get('/:id', protect, checkPermission('bookings', 'read'), getItineraryById);

/**
 * @swagger
 * /itineraries/{id}/confirm:
 *   patch:
 *     summary: Confirm a pending itinerary — all legs become confirmed
 *     tags: [Itineraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Itinerary confirmed
 *       400:
 *         description: Itinerary is not pending
 *       404:
 *         description: Itinerary not found
 */
router.patch('/:id/confirm', protect, checkPermission('bookings', 'update'), confirmItinerary);

/**
 * @swagger
 * /itineraries/{id}/cancel:
 *   patch:
 *     summary: Cancel an itinerary — all legs cancelled and seats released
 *     tags: [Itineraries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Passenger changed plans"
 *     responses:
 *       200:
 *         description: Itinerary cancelled
 *       400:
 *         description: Itinerary is already cancelled
 *       404:
 *         description: Itinerary not found
 */
router.patch('/:id/cancel', protect, checkPermission('bookings', 'update'), cancelItinerary);

module.exports = router;
