import { Router } from 'express';

import { authController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { registerValidation, loginValidation, updateProfileValidation } from '../validators/auth';

const router = Router();

// POST /auth/register - Register a new user
router.post('/register', validate(registerValidation), authController.register);

// POST /auth/login - Login user
router.post('/login', validate(loginValidation), authController.login);

// GET /auth/profile - Get current user profile (protected)
router.get('/profile', authenticate, authController.getProfile);

// PUT /auth/profile - Update current user profile (protected)
router.put('/profile', authenticate, validate(updateProfileValidation), authController.updateProfile);

export default router;