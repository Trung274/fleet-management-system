const express = require('express');
const router = express.Router();
const routeController = require('../controllers/route.controller');
const { protect, checkPermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Routes
 *   description: Route management endpoints
 */

/**
 * @swagger
 * /api/v1/routes:
 *   post:
 *     summary: "Create new route (Admin, Manager)"
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - origin
 *               - destination
 *               - distance
 *               - estimatedDuration
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Downtown Express"
 *               code:
 *                 type: string
 *                 example: "RT-001"
 *               description:
 *                 type: string
 *                 example: "Express route to downtown area"
 *               origin:
 *                 type: string
 *                 example: "Central Station"
 *               destination:
 *                 type: string
 *                 example: "Downtown Terminal"
 *               distance:
 *                 type: number
 *                 example: 25.5
 *               estimatedDuration:
 *                 type: number
 *                 example: 45
 *               status:
 *                 type: string
 *                 enum: [active, inactive, under-maintenance, discontinued]
 *                 example: "active"
 *               serviceType:
 *                 type: string
 *                 enum: [express, local, shuttle]
 *                 example: "express"
 *     responses:
 *       201:
 *         description: Route created successfully
 *       400:
 *         description: Bad request - validation error or duplicate code
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post('/', 
  protect, 
  checkPermission('routes', 'create'),
  routeController.createRoute
);

/**
 * @swagger
 * /api/v1/routes:
 *   get:
 *     summary: "Get all routes (Authenticated)"
 *     tags: [Routes]
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
 *         description: Sort field (prefix with - for descending)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (comma-separated for multiple)
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *         description: Filter by service type (comma-separated for multiple)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, code, origin, and destination
 *     responses:
 *       200:
 *         description: List of routes with pagination
 *       401:
 *         description: Unauthorized
 */
router.get('/', 
  protect, 
  routeController.getAllRoutes
);

/**
 * @swagger
 * /api/v1/routes/{id}:
 *   get:
 *     summary: "Get route by ID (Authenticated)"
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route data with populated stops
 *       404:
 *         description: Route not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', 
  protect, 
  routeController.getRouteById
);

/**
 * @swagger
 * /api/v1/routes/{id}:
 *   put:
 *     summary: "Update route (Admin, Manager)"
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               origin:
 *                 type: string
 *               destination:
 *                 type: string
 *               distance:
 *                 type: number
 *               estimatedDuration:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive, under-maintenance, discontinued]
 *               serviceType:
 *                 type: string
 *                 enum: [express, local, shuttle]
 *     responses:
 *       200:
 *         description: Route updated successfully
 *       400:
 *         description: Bad request - validation error or cannot change discontinued route status
 *       404:
 *         description: Route not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.put('/:id', 
  protect, 
  checkPermission('routes', 'update'),
  routeController.updateRoute
);

/**
 * @swagger
 * /api/v1/routes/{id}:
 *   delete:
 *     summary: "Delete route (Admin, Manager)"
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route and associated stops deleted successfully
 *       404:
 *         description: Route not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.delete('/:id', 
  protect, 
  checkPermission('routes', 'delete'),
  routeController.deleteRoute
);

/**
 * @swagger
 * /api/v1/routes/{id}/stops:
 *   post:
 *     summary: "Add stop to route (Admin, Manager)"
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stopName
 *               - stopCode
 *               - sequence
 *             properties:
 *               stopName:
 *                 type: string
 *                 example: "Main Street Station"
 *               stopCode:
 *                 type: string
 *                 example: "MS-01"
 *               address:
 *                 type: string
 *                 example: "123 Main Street"
 *               sequence:
 *                 type: number
 *                 example: 1
 *               distanceFromStart:
 *                 type: number
 *                 example: 5.2
 *               estimatedArrivalTime:
 *                 type: number
 *                 example: 10
 *               estimatedDepartureTime:
 *                 type: number
 *                 example: 12
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     example: -74.0060
 *     responses:
 *       201:
 *         description: Stop added to route successfully
 *       400:
 *         description: Bad request - validation error or duplicate sequence
 *       404:
 *         description: Route not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post('/:id/stops', 
  protect, 
  checkPermission('routes', 'update'),
  routeController.addStopToRoute
);

/**
 * @swagger
 * /api/v1/routes/{id}/stops/{stopId}:
 *   put:
 *     summary: "Update route stop (Admin, Manager)"
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stop ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stopName:
 *                 type: string
 *               stopCode:
 *                 type: string
 *               address:
 *                 type: string
 *               sequence:
 *                 type: number
 *               distanceFromStart:
 *                 type: number
 *               estimatedArrivalTime:
 *                 type: number
 *               estimatedDepartureTime:
 *                 type: number
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       200:
 *         description: Route stop updated successfully
 *       400:
 *         description: Bad request - validation error or duplicate sequence
 *       404:
 *         description: Route stop not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.put('/:id/stops/:stopId', 
  protect, 
  checkPermission('routes', 'update'),
  routeController.updateRouteStop
);

/**
 * @swagger
 * /api/v1/routes/{id}/stops/{stopId}:
 *   delete:
 *     summary: "Remove stop from route (Admin, Manager)"
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stop ID
 *     responses:
 *       200:
 *         description: Stop removed from route successfully
 *       404:
 *         description: Route stop not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.delete('/:id/stops/:stopId', 
  protect, 
  checkPermission('routes', 'update'),
  routeController.removeStopFromRoute
);

module.exports = router;
