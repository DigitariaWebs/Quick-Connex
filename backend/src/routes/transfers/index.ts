/**
 * Transfer Routes Index
 * 
 * Main router that mounts all transfer-related sub-routers.
 */

import { Router } from 'express';
import transferRoutes from './transfer.routes';
import actionsRoutes from './transfer-actions.routes';
import adminRoutes from './transfer-admin.routes';
import timelineRoutes from './timeline.routes';

const router = Router();

// Mount sub-routers (non-admin only)
router.use('/', transferRoutes);
router.use('/', actionsRoutes);

// Export both routers for separate mounting
export const transferRouter = router;
export const timelineRouter = timelineRoutes;
export const adminTransferRouter = adminRoutes;
export default router;
