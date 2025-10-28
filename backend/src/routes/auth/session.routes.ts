/**
 * Session Routes
 * 
 * Session management routes for listing, refreshing, and revoking sessions.
 */

import { Router } from 'express';
import * as sessionController from '../../controllers/auth/session.controller';

const router = Router();

/**
 * List user sessions endpoint
 * GET /api/auth/sessions
 */
router.get('/', sessionController.listSessions);

/**
 * Refresh session endpoint
 * POST /api/auth/sessions/refresh
 */
router.post('/refresh', sessionController.refreshSession);

/**
 * Revoke specific session endpoint
 * DELETE /api/auth/sessions/:sessionId
 */
router.delete('/:sessionId', sessionController.revokeSession);

export default router;
