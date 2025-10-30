/**
 * CIUSSS Routes
 * 
 * CIUSSS management routes with authentication for create operations.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import * as controller from '../../controllers/ciusss/ciusss.controller';

const router = Router();

// Public read access
router.get('/', controller.getCIUSSS);

// Admin only for create
router.post('/', authenticate, authorize(['admin', 'super_admin']), controller.createCIUSSS);

export default router;
