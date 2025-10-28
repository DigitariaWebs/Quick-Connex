/**
 * Auth Routes
 * 
 * Authentication routes for login, logout, and user info.
 */

import { Router } from 'express';
import * as authController from '../../controllers/auth/auth.controller';

const router = Router();

/**
 * Login endpoint
 * POST /api/auth/login
 */
router.post('/login', authController.login);

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
router.post('/logout', authController.logout);

/**
 * Get current user endpoint
 * GET /api/auth/me
 */
router.get('/me', authController.getCurrentUser);

export default router;
