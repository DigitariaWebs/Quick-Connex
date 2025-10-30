/**
 * Transfer Admin Routes
 * 
 * Administrative routes for transfer management including bulk operations and analytics.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import * as controller from '@/controllers/transfers/transfer-admin.controller';

const router = Router();

// All routes require authentication and admin privileges
router.use(authenticate);
router.use(authorize(['admin', 'super_admin']));

/**
 * GET /admin/transfers - Get transfers with advanced filtering
 * Query params: status, priority, category, fromHospital, toHospital, requestedBy, assignedTo, dateStart, dateEnd, search, page, limit, sortBy, sortOrder
 */
router.get('/', controller.getAdminTransfers);

/**
 * POST /admin/transfers - Bulk operations
 * Body: { action, transferIds, reason?, newStatus?, newPriority?, reassignTo? }
 */
router.post('/', controller.bulkOperations);

/**
 * GET /admin/transfers/analytics - Get transfer analytics
 * Query params: dateFrom, dateTo
 */
router.get('/analytics', controller.getAnalytics);

/**
 * GET /admin/transfers/:id - Get detailed transfer information
 */
router.get('/:id', controller.getTransferDetails);

/**
 * PUT /admin/transfers/:id - Update transfer with admin privileges
 * Body: Transfer update data
 */
router.put('/:id', controller.updateTransfer);

/**
 * DELETE /admin/transfers/:id - Delete transfer
 * Auth: Super admins only
 */
router.delete('/:id', authorize(['super_admin']), controller.deleteTransfer);

/**
 * POST /admin/transfers/:id/reassign - Reassign transfer
 * Body: { newEmployeeId, reason? }
 */
router.post('/:id/reassign', controller.reassignTransfer);

/**
 * POST /admin/transfers/:id/actions - Execute admin action
 * Body: { action, ...actionData }
 */
router.post('/:id/actions', controller.executeAdminAction);

export default router;
