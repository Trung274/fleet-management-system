const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');
const { protect, authorize, checkPermission } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: Permission management endpoints
 */

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

/**
 * @swagger
 * /api/v1/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: grouped
 *         schema:
 *           type: boolean
 *         description: Group permissions by resource
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/', 
  checkPermission('permissions', 'list'),
  permissionController.getAllPermissions
);

/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   get:
 *     summary: Get permission by ID
 *     tags: [Permissions]
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
 *         description: Permission data
 *       404:
 *         description: Permission not found
 */
router.get('/:id', 
  checkPermission('permissions', 'read'),
  permissionController.getPermissionById
);

/**
 * @swagger
 * /api/v1/permissions:
 *   post:
 *     summary: Create new permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource
 *               - action
 *             properties:
 *               resource:
 *                 type: string
 *                 example: posts
 *               action:
 *                 type: string
 *                 example: create
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created
 */
router.post('/', 
  checkPermission('permissions', 'create'),
  permissionController.createPermission
);

/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   put:
 *     summary: Update permission
 *     tags: [Permissions]
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
 *         description: Permission updated
 */
router.put('/:id', 
  checkPermission('permissions', 'update'),
  permissionController.updatePermission
);

/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   put:
 *     summary: Update permission
 *     tags: [Permissions]
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
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Permission updated
 */


/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   delete:
 *     summary: Delete permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       404:
 *         description: Permission not found
 *       403:
 *         description: Forbidden - Admin only
 */
router.delete('/:id', 
  checkPermission('permissions', 'delete'),
  permissionController.deletePermission
);

module.exports = router;