/**
 * Timeline Routes
 * 
 * Routes for timeline operations including events, stats, and recent activity.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as controller from '@/controllers/transfers/timeline.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /timeline/transfer/:transferId - Get timeline for a specific transfer
 * Query params: page, limit, startDate, endDate, eventType, actorType
 */
router.get('/transfer/:transferId', controller.getTransferTimeline);

/**
 * GET /timeline/transfer/:transferId/stats - Get timeline statistics
 */
router.get('/transfer/:transferId/stats', controller.getTimelineStats);

/**
 * GET /timeline/recent - Get recent activity across all transfers
 * Query params: page, limit, days, eventType, actorType
 */
router.get('/recent', controller.getRecentActivity);

export default router;
