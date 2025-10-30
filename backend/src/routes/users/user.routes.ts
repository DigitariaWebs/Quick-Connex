/**
 * User Routes
 * 
 * Core user routes with authentication.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as controller from '../../controllers/users/user.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /users/profile - Get current user profile with transfer stats and recent activity
 */
router.get('/profile', controller.getProfile);

export default router;
