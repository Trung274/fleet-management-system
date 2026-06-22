const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard summary statistics
 */

/**
 * @swagger
 * /api/v1/dashboard:
 *   get:
 *     summary: "Get dashboard summary statistics (Authenticated)"
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
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
 *                     vehicles:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 20
 *                         active:
 *                           type: integer
 *                           example: 15
 *                         maintenance:
 *                           type: integer
 *                           example: 3
 *                         outOfService:
 *                           type: integer
 *                           example: 2
 *                     drivers:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 30
 *                         active:
 *                           type: integer
 *                           example: 25
 *                         inactive:
 *                           type: integer
 *                           example: 5
 *                     tripsToday:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 8
 *                         inProgress:
 *                           type: integer
 *                           example: 2
 *                     bookingsToday:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 45
 *                         confirmed:
 *                           type: integer
 *                           example: 38
 *                     recentTrips:
 *                       type: array
 *                       description: Last 5 trips sorted by scheduled departure (desc)
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, dashboardController.getDashboardStats);

module.exports = router;
