const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { protect, checkPermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Drivers
 *   description: Driver management endpoints
 */

/**
 * @swagger
 * /api/v1/drivers:
 *   post:
 *     summary: "Create new driver (Admin, Manager)"
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phone
 *               - licenseNumber
 *               - licenseType
 *               - licenseExpiry
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 example: "john.doe@example.com"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1985-05-15"
 *               address:
 *                 type: string
 *                 example: "123 Main St, City, State"
 *               licenseNumber:
 *                 type: string
 *                 example: "DL123456"
 *               licenseType:
 *                 type: string
 *                 enum: [Class A, Class B, Class C]
 *                 example: "Class B"
 *               licenseExpiry:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *               employmentStatus:
 *                 type: string
 *                 enum: [active, on-leave, suspended, terminated]
 *                 example: "active"
 *               hireDate:
 *                 type: string
 *                 format: date
 *                 example: "2020-01-15"
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Jane Doe"
 *                   phone:
 *                     type: string
 *                     example: "+1234567891"
 *                   relationship:
 *                     type: string
 *                     example: "Spouse"
 *               notes:
 *                 type: string
 *                 example: "Experienced driver with clean record"
 *     responses:
 *       201:
 *         description: Driver created successfully
 *       400:
 *         description: Bad request - validation error or duplicate license/email
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post('/', 
  protect, 
  checkPermission('drivers', 'create'),
  driverController.createDriver
);

/**
 * @swagger
 * /api/v1/drivers:
 *   get:
 *     summary: "Get all drivers (Admin, Manager)"
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default 10, max 100)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (prefix with - for descending, e.g., -createdAt)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by employment status (comma-separated for multiple, e.g., active,on-leave)
 *       - in: query
 *         name: licenseType
 *         schema:
 *           type: string
 *         description: Filter by license type (comma-separated for multiple, e.g., Class A,Class B)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in firstName, lastName, email, and licenseNumber
 *     responses:
 *       200:
 *         description: List of drivers with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/', 
  protect, 
  checkPermission('drivers', 'read'),
  driverController.getAllDrivers
);

/**
 * @swagger
 * /api/v1/drivers/{id}:
 *   get:
 *     summary: "Get driver by ID (Admin, Manager)"
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver data
 *       404:
 *         description: Driver not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/:id', 
  protect, 
  checkPermission('drivers', 'read'),
  driverController.getDriverById
);

/**
 * @swagger
 * /api/v1/drivers/{id}:
 *   put:
 *     summary: "Update driver (Admin, Manager)"
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               address:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *               licenseType:
 *                 type: string
 *                 enum: [Class A, Class B, Class C]
 *               licenseExpiry:
 *                 type: string
 *                 format: date
 *               employmentStatus:
 *                 type: string
 *                 enum: [active, on-leave, suspended, terminated]
 *               hireDate:
 *                 type: string
 *                 format: date
 *               terminationDate:
 *                 type: string
 *                 format: date
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   relationship:
 *                     type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver updated successfully
 *       400:
 *         description: Bad request - validation error or cannot change terminated driver status
 *       404:
 *         description: Driver not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.put('/:id', 
  protect, 
  checkPermission('drivers', 'update'),
  driverController.updateDriver
);

/**
 * @swagger
 * /api/v1/drivers/{id}:
 *   delete:
 *     summary: "Delete driver (Admin, Manager)"
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver deleted successfully
 *       404:
 *         description: Driver not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.delete('/:id', 
  protect, 
  checkPermission('drivers', 'delete'),
  driverController.deleteDriver
);

module.exports = router;
