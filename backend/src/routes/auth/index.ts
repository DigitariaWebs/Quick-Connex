/**
 * Auth Routes Index
 * 
 * Main authentication routes aggregator.
 */

import { Router } from 'express';
import tokenRoutes from './token.routes';
import authRoutes from './auth.routes';
import sessionRoutes from './session.routes';

const router = Router();

// Mount auth routes (login, logout, me)
router.use('/', authRoutes);

// Mount session routes (sessions management)
router.use('/sessions', sessionRoutes);

// Mount token routes (legacy token operations)
router.use('/token', tokenRoutes);

export default router;
