import { Router } from 'express';

import { API_ROUTES } from '../../shared/constants';
import authRoutes from './auth';
import healthRoutes from './health';
import userRoutes from './users';

const router = Router();

// Health check route
router.use(API_ROUTES.HEALTH, healthRoutes);

// Authentication routes
router.use(API_ROUTES.AUTH.BASE, authRoutes);

// User management routes
router.use(API_ROUTES.USERS.BASE, userRoutes);

export default router;