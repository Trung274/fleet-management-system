const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/auth');
const {
  initializeSeats,
  getSeatMap,
  getSeatAvailability,
  updateSeat
} = require('../controllers/seat.controller');

/**
 * @swagger
 * tags:
 *   name: Seats
 *   description: Seat inventory management and availability tracking
 */

/**
 * @swagger
 * /seats/availability:
 *   get:
 *     summary: Check seat availability for a trip (Public)
 *     tags: [Seats]
 *     parameters:
 *       - in: query
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: The trip ID to check availability for
 *     responses:
 *       200:
 *         description: Seat availability summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tripId:
 *                       type: string
 *                     totalSeats:
 *                       type: integer
 *                     availableSeats:
 *                       type: integer
 *                     reservedSeats:
 *                       type: integer
 *                     bookedSeats:
 *                       type: integer
 *                     unavailableSeats:
 *                       type: integer
 *                     seats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           seatNumber:
 *                             type: integer
 *                           type:
 *                             type: string
 *                           status:
 *                             type: string
 *       400:
 *         description: Missing tripId parameter
 *       404:
 *         description: Trip not found
 */
router.get('/availability', getSeatAvailability);

/**
 * @swagger
 * /seats/initialize:
 *   post:
 *     summary: Initialize seat inventory for a trip (Manager)
 *     tags: [Seats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tripId
 *             properties:
 *               tripId:
 *                 type: string
 *                 description: The trip ID to initialize seats for
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       201:
 *         description: Seats initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Number of seats created
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Seats already initialized for this trip or missing tripId
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Trip not found
 */
router.post('/initialize', protect, checkPermission('seats', 'update'), initializeSeats);

/**
 * @swagger
 * /seats:
 *   get:
 *     summary: Get full seat map for a trip (Manager, Staff)
 *     tags: [Seats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *         description: The trip ID to get seat map for
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, reserved, booked, unavailable]
 *         description: Filter seats by status
 *     responses:
 *       200:
 *         description: Seat map for the trip
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Missing tripId parameter
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', protect, checkPermission('seats', 'read'), getSeatMap);

/**
 * @swagger
 * /seats/{id}:
 *   patch:
 *     summary: Manually update a seat status (Manager)
 *     tags: [Seats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Seat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, unavailable]
 *                 description: New seat status (cannot manually set reserved or booked)
 *     responses:
 *       200:
 *         description: Seat status updated successfully
 *       400:
 *         description: Invalid status or cannot manually set reserved/booked
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Seat not found
 */
router.patch('/:id', protect, checkPermission('seats', 'update'), updateSeat);

module.exports = router;
