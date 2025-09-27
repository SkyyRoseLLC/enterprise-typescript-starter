import type { Request, Response } from 'express';

import { HTTP_STATUS } from '../../shared/constants';
import { asyncHandler } from '../middleware/error';
import { userService } from '../services/UserService';
import { logger } from '../utils/logger';
import { sendSuccess, sendPaginatedResponse } from '../utils/response';

export class UserController {
  getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    logger.info('Get all users request received', { page, limit });
    
    const result = await userService.getAllUsers({ page, limit });
    
    sendPaginatedResponse(
      res,
      result.users,
      result.page,
      result.limit,
      result.total,
      'Users retrieved successfully'
    );
  });

  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    logger.info('Get user by ID request received', { id });
    
    const user = await userService.getUserById(id);
    
    sendSuccess(res, user, 'User retrieved successfully');
  });

  updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updates = req.body;
    
    logger.info('Update user request received', { id, updates });
    
    const user = await userService.updateUser(id, updates);
    
    sendSuccess(res, user, 'User updated successfully');
  });

  deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    
    logger.info('Delete user request received', { id });
    
    await userService.deleteUser(id);
    
    sendSuccess(res, null, 'User deleted successfully', HTTP_STATUS.NO_CONTENT);
  });
}

export const userController = new UserController();