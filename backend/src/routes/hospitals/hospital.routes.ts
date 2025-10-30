/**
 * Hospital Routes
 * 
 * Hospital management routes (public access for lookups).
 */

import { Router } from 'express';
import * as controller from '../../controllers/hospitals/hospital.controller';

const router = Router();

// Public endpoints (no auth required for hospital lookups)
router.get('/', controller.getHospitals);
router.post('/', controller.getOrganizations);

export default router;
