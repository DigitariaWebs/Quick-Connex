/**
 * Auth Routes
 * 
 * Authentication routes with dual-token system.
 */

import { Router } from 'express';
import * as tokenController from '../../controllers/auth/token.controller';

const router = Router();

/**
 * Token refresh endpoint
 * POST /api/auth/refresh
 */
router.post('/refresh', tokenController.refreshToken);

/**
 * Token validation endpoint
 * GET /api/auth/validate
 */
router.get('/validate', tokenController.validateToken);

/**
 * Token revocation endpoint
 * POST /api/auth/revoke
 */
router.post('/revoke', tokenController.revokeToken);

/**
 * User token revocation endpoint
 * POST /api/auth/revoke-all
 */
router.post('/revoke-all', tokenController.revokeAllUserTokens);

/**
 * Token cleanup endpoint
 * POST /api/auth/cleanup
 */
router.post('/cleanup', tokenController.cleanupTokens);

export default router;
