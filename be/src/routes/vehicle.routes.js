const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const { protect, checkPermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle management endpoints
 */

/**
 * @swagger
 * /api/v1/vehicles:
 *   post:
 *     summary: "Create new vehicle (Admin, Manager)"
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - registrationNumber
 *               - make
 *               - model
 *               - year
 *               - capacity
 *             properties:
 *               registrationNumber:
 *                 type: string
 *                 example: "ABC-1234"
 *               make:
 *                 type: string
 *                 example: "Toyota"
 *               model:
 *                 type: string
 *                 example: "Coaster"
 *               year:
 *                 type: integer
 *                 example: 2023
 *               capacity:
 *                 type: integer
 *                 example: 30
 *               status:
 *                 type: string
 *                 enum: [active, maintenance, out-of-service, retired]
 *                 example: "active"
 *               color:
 *                 type: string
 *                 example: "White"
 *               vin:
 *                 type: string
 *                 example: "1HGBH41JXMN109186"
 *               notes:
 *                 type: string
 *                 example: "New vehicle purchased in 2023"
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       400:
 *         description: Bad request - validation error or duplicate registration
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post('/', 
  protect, 
  checkPermission('vehicles', 'create'),
  vehicleController.createVehicle
);

/**
 * @swagger
 * /api/v1/vehicles:
 *   get:
 *     summary: "Get all vehicles (Admin, Manager)"
 *     tags: [Vehicles]
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
 *         description: Filter by status (comma-separated for multiple, e.g., active,maintenance)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in registrationNumber, make, and model
 *     responses:
 *       200:
 *         description: List of vehicles with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/', 
  protect, 
  checkPermission('vehicles', 'read'),
  vehicleController.getAllVehicles
);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   get:
 *     summary: "Get vehicle by ID (Admin, Manager)"
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle data
 *       404:
 *         description: Vehicle not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get('/:id', 
  protect, 
  checkPermission('vehicles', 'read'),
  vehicleController.getVehicleById
);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   put:
 *     summary: "Update vehicle (Admin, Manager)"
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               registrationNumber:
 *                 type: string
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               capacity:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [active, maintenance, out-of-service, retired]
 *               color:
 *                 type: string
 *               vin:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       400:
 *         description: Bad request - validation error or cannot change retired vehicle status
 *       404:
 *         description: Vehicle not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.put('/:id', 
  protect, 
  checkPermission('vehicles', 'update'),
  vehicleController.updateVehicle
);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   delete:
 *     summary: "Delete vehicle (Admin, Manager)"
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 *       404:
 *         description: Vehicle not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.delete('/:id', 
  protect, 
  checkPermission('vehicles', 'delete'),
  vehicleController.deleteVehicle
);

module.exports = router;
