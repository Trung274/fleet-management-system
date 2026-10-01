const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getNotifications } = require('../controllers/notification.controller');

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Alerts for the header bell (computed on request, filtered by the caller's permissions)
 *     description: |
 *       Vehicle inspection / periodic maintenance due or overdue, upcoming or overrunning maintenance,
 *       driver licenses expiring, upcoming trips whose driver or vehicle can no longer run them,
 *       and itineraries at risk of a missed connection. Each item has a stable `id` for read tracking.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alerts sorted by severity (error, warning, info) then date
 */
router.get('/', protect, getNotifications);

module.exports = router;
