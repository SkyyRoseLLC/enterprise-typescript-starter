import { HTTP_STATUS, ERROR_MESSAGES } from '../../shared/constants';
import type { User, PaginationParams } from '../../shared/types';
import { userModel } from '../models/User';
import { logger } from '../utils/logger';
import { createError } from '../middleware/error';

export class UserService {
  async getAllUsers(pagination: PaginationParams): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    logger.debug(`Fetching users with pagination`, { page, limit, skip });

    const { users, total } = await userModel.findAll(skip, limit);

    logger.info(`Fetched ${users.length} users out of ${total} total`);

    return {
      users,
      total,
      page,
      limit,
    };
  }

  async getUserById(id: string): Promise<User> {
    logger.debug(`Fetching user by ID: ${id}`);

    const user = await userModel.findById(id);
    if (!user) {
      logger.warn(`User not found with ID: ${id}`);
      throw createError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return user;
  }

  async updateUser(id: string, updates: Partial<Pick<User, 'name' | 'email'>>): Promise<User> {
    logger.info(`Updating user with ID: ${id}`, { updates });

    try {
      const user = await userModel.update(id, updates);
      if (!user) {
        logger.warn(`User not found for update with ID: ${id}`);
        throw createError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      logger.info(`User updated successfully with ID: ${id}`);
      return user;
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already exists') {
        logger.warn(`Update failed: Email already exists - ${updates.email}`);
        throw createError(ERROR_MESSAGES.DUPLICATE_EMAIL, HTTP_STATUS.CONFLICT);
      }
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    logger.info(`Deleting user with ID: ${id}`);

    const deleted = await userModel.delete(id);
    if (!deleted) {
      logger.warn(`User not found for deletion with ID: ${id}`);
      throw createError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    logger.info(`User deleted successfully with ID: ${id}`);
  }

  async checkUserExists(email: string): Promise<boolean> {
    logger.debug(`Checking if user exists with email: ${email}`);
    return userModel.exists(email);
  }
}

export const userService = new UserService();