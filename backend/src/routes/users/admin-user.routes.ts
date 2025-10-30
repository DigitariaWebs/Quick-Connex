/**
 * Admin User Routes
 * 
 * Administrative user management routes with authentication and authorization.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import * as controller from '../../controllers/users/admin-user.controller';

const router = Router();

// All routes require authentication and admin privileges
router.use(authenticate);
router.use(authorize(['admin', 'super_admin']));

/**
 * GET /admin/users - List users with filtering
 * Query params: search, userType, status, startDate, endDate, page, limit
 */
router.get('/', controller.getUsers);

/**
 * POST /admin/users - Create new user
 * Body: { firstName, lastName, email, userType, ciusssId?, hospitalId?, phone?, post? }
 */
router.post('/', controller.createUser);

/**
 * GET /admin/users/stats - User statistics
 */
router.get('/stats', controller.getUserStats);

/**
 * POST /admin/users/bulk-approve - Bulk approve users
 * Body: { userIds: string[] }
 */
router.post('/bulk-approve', controller.bulkApprove);

/**
 * POST /admin/users/bulk-reject - Bulk reject users
 * Body: { userIds: string[], reason: string }
 */
router.post('/bulk-reject', controller.bulkReject);

/**
 * POST /admin/users/bulk-suspend - Bulk suspend users
 * Body: { userIds: string[], reason: string }
 */
router.post('/bulk-suspend', controller.bulkSuspend);

export default router;
