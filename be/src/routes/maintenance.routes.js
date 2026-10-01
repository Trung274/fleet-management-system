const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/auth');
const c = require('../controllers/maintenance.controller');

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Vehicle maintenance / inspection schedule. A vehicle cannot run trips during maintenance.
 */

/**
 * @swagger
 * /maintenance:
 *   get:
 *     summary: List maintenance records
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: vehicle, schema: { type: string }, description: Vehicle id }
 *       - { in: query, name: type, schema: { type: string, enum: [periodic, repair, inspection] } }
 *       - { in: query, name: status, schema: { type: string }, description: "Comma-separated, e.g. scheduled,in-progress" }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: List of records }
 *   post:
 *     summary: Schedule maintenance
 *     description: Returns 409 with `data.conflictingTrips` when the vehicle has trips in that window — reassign them first.
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicle, type, scheduledStart, scheduledEnd]
 *             properties:
 *               vehicle: { type: string }
 *               type: { type: string, enum: [periodic, repair, inspection] }
 *               scheduledStart: { type: string, format: date-time }
 *               scheduledEnd: { type: string, format: date-time }
 *               garage: { type: string }
 *               cost: { type: number }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid window, retired vehicle, or overlapping maintenance }
 *       409: { description: Vehicle has trips in this window }
 */
router.get('/', protect, checkPermission('maintenance', 'read'), c.getAllMaintenance);
router.post('/', protect, checkPermission('maintenance', 'create'), c.createMaintenance);

/**
 * @swagger
 * /maintenance/{id}:
 *   get:
 *     summary: Get a maintenance record
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Record }
 *       404: { description: Not found }
 *   put:
 *     summary: Edit a scheduled record (same conflict rules as create)
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated }
 *       409: { description: Vehicle has trips in the new window }
 *   delete:
 *     summary: Delete a scheduled or cancelled record
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/:id', protect, checkPermission('maintenance', 'read'), c.getMaintenanceById);
router.put('/:id', protect, checkPermission('maintenance', 'update'), c.updateMaintenance);
router.delete('/:id', protect, checkPermission('maintenance', 'delete'), c.deleteMaintenance);

/**
 * @swagger
 * /maintenance/{id}/start:
 *   patch:
 *     summary: Start now — vehicle status becomes maintenance
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Started }
 * /maintenance/{id}/complete:
 *   patch:
 *     summary: Complete — vehicle back to active; inspection requires inspectionExpiry
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inspectionExpiry: { type: string, format: date }
 *               cost: { type: number }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Completed }
 * /maintenance/{id}/cancel:
 *   patch:
 *     summary: Cancel — if running, vehicle back to active
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Cancelled }
 */
router.patch('/:id/start', protect, checkPermission('maintenance', 'update'), c.startMaintenance);
router.patch('/:id/complete', protect, checkPermission('maintenance', 'update'), c.completeMaintenance);
router.patch('/:id/cancel', protect, checkPermission('maintenance', 'update'), c.cancelMaintenance);

module.exports = router;
