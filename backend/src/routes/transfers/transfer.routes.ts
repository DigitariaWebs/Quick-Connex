/**
 * Transfer Routes
 * 
 * Core transfer routes with authentication and authorization.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import * as controller from '@/controllers/transfers/transfer.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /transfers - Get all transfers with filtering and pagination
 * Query params: status, priority, page, limit, sortBy, sortOrder, search
 */
router.get('/', controller.getTransfers);

/**
 * POST /transfers - Create new transfer
 * Body: Complete transfer data
 * Auth: Managers/admins only
 */
router.post('/', authorize(['manager', 'admin', 'super_admin']), controller.createTransfer);

/**
 * GET /transfers/my-accepted - Get employee's accepted transfers
 * Query params: status
 * Auth: Employees only
 */
router.get('/my-accepted', authorize(['employee']), controller.getMyAcceptedTransfers);

/**
 * GET /transfers/search - Search transfers
 * Query params: search, status, priority, page, limit
 */
router.get('/search', controller.searchTransfers);

export default router;
