/**
 * Transfer Actions Routes
 * 
 * Routes for transfer actions like accept, approve, reject, cancel, and notifications.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import * as controller from '@/controllers/transfers/transfer-actions.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /transfers/:transferId/accept - Get transfer acceptance info
 * Auth: All authenticated users
 */
router.get('/:transferId/accept', controller.getAcceptInfo);

/**
 * PUT /transfers/:transferId/accept - Employee accepts transfer
 * Body: { assignedTo, notes? }
 * Auth: Employees only
 */
router.put('/:transferId/accept', authorize(['employee']), controller.acceptTransfer);

/**
 * POST /transfers/:transferId/approve - Admin approves transfer
 * Body: { adminEmail, reason? }
 * Auth: Admins only
 */
router.post('/:transferId/approve', authorize(['admin', 'super_admin']), controller.approveTransfer);

/**
 * POST /transfers/:transferId/reject - Admin rejects transfer
 * Body: { adminEmail, reason? }
 * Auth: Admins only
 */
router.post('/:transferId/reject', authorize(['admin', 'super_admin']), controller.rejectTransfer);

/**
 * GET /transfers/:transferId/cancel - Get transfer cancellation info
 * Auth: All authenticated users
 */
router.get('/:transferId/cancel', controller.getCancelInfo);

/**
 * PUT /transfers/:transferId/cancel - Cancel transfer
 * Body: { reason }
 * Auth: Assigned employee or admin
 */
router.put('/:transferId/cancel', controller.cancelTransfer);

/**
 * POST /transfers/:transferId/notify - Send notifications for transfer
 * Auth: Managers/admins only
 */
router.post('/:transferId/notify', authorize(['manager', 'admin', 'super_admin']), controller.sendNotifications);

export default router;
