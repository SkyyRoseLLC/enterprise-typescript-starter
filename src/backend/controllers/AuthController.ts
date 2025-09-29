import type { Request, Response } from 'express';

import { HTTP_STATUS } from '../../shared/constants';
import type { CreateUserRequest, LoginRequest } from '../../shared/types';
import type { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { authService } from '../services/AuthService';
import { logger } from '../utils/logger';
import { sendSuccess } from '../utils/response';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userData: CreateUserRequest = req.body;
    
    logger.info('Registration request received', { email: userData.email });
    
    const result = await authService.register(userData);
    
    sendSuccess(res, result, 'User registered successfully', HTTP_STATUS.CREATED);
  });

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const credentials: LoginRequest = req.body;
    
    logger.info('Login request received', { email: credentials.email });
    
    const result = await authService.login(credentials);
    
    sendSuccess(res, result, 'Login successful');
  });

  getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    
    logger.debug('Profile request received', { userId });
    
    const user = await authService.getProfile(userId);
    
    sendSuccess(res, user, 'Profile retrieved successfully');
  });

  updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const updates = req.body;
    
    logger.info('Profile update request received', { userId, updates });
    
    const user = await authService.updateProfile(userId, updates);
    
    sendSuccess(res, user, 'Profile updated successfully');
  });
}

export const authController = new AuthController();