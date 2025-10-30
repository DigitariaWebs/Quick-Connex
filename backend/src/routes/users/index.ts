/**
 * User Routes Index
 * 
 * Main router that exports user-related routers.
 */

import { Router } from 'express';
import userRoutes from './user.routes';
import adminUserRoutes from './admin-user.routes';

const router = Router();

// Mount user routes
router.use('/', userRoutes);

// Export both routers for separate mounting
export const userRouter = router;
export const adminUserRouter = adminUserRoutes;
