const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/auth');
const {
  createBooking,
  confirmBooking,
  cancelBooking,
  getAllBookings,
  getBookingById,
  deleteBooking
} = require('../controllers/booking.controller');

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Passenger booking management
 */

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking and reserve a seat (Manager, Staff)
 *     tags: [Bookings]
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
 *               - seatId
 *               - passenger
 *             properties:
 *               tripId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               seatId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439012"
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
 *               fare:
 *                 type: number
 *                 example: 150000
 *     responses:
 *       201:
 *         description: Booking created — seat reserved (status pending)
 *       400:
 *         description: Missing required fields, seat belongs to different trip, or trip not schedulable
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Trip or seat not found
 *       409:
 *         description: Seat is not available for booking
 */
router.post('/', protect, checkPermission('bookings', 'create'), createBooking);

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: List all bookings with pagination and filters (Manager, Staff)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tripId
 *         schema:
 *           type: string
 *         description: Filter by trip ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *         description: Filter by booking status
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
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-bookedAt"
 *     responses:
 *       200:
 *         description: Paginated list of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', protect, checkPermission('bookings', 'read'), getAllBookings);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get a single booking with full details (Manager, Staff)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Full booking details including trip, route, seat, and passenger info
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Booking not found
 */
router.get('/:id', protect, checkPermission('bookings', 'read'), getBookingById);

/**
 * @swagger
 * /bookings/{id}/confirm:
 *   patch:
 *     summary: Confirm a pending booking — seat becomes booked (Manager, Staff)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking confirmed — seat status updated to booked
 *       400:
 *         description: Only pending bookings can be confirmed
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/confirm', protect, checkPermission('bookings', 'update'), confirmBooking);

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel a booking and release the seat (Manager, Staff)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Passenger requested cancellation"
 *     responses:
 *       200:
 *         description: Booking cancelled — seat released back to available
 *       400:
 *         description: Booking is already cancelled
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/cancel', protect, checkPermission('bookings', 'update'), cancelBooking);

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Delete a booking record (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking deleted — seat released if booking was active
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Booking not found
 */
router.delete('/:id', protect, checkPermission('bookings', 'delete'), deleteBooking);

module.exports = router;
