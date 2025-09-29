import { Router } from 'express';

import { healthController } from '../controllers/HealthController';

const router = Router();

// GET /health - Health check endpoint
router.get('/', healthController.healthCheck);

export default router;