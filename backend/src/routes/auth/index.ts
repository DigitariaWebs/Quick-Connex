/**
 * Auth Routes Index
 * 
 * Main authentication routes aggregator.
 */

import { Router } from 'express';
import tokenRoutes from './token.routes';

const router = Router();

// Mount token routes
router.use('/token', tokenRoutes);

export default router;
