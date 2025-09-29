import { randomUUID } from 'crypto';

import { HTTP_STATUS, ERROR_MESSAGES } from '../../shared/constants';
import type { CreateUserRequest, LoginRequest, AuthResponse, User } from '../../shared/types';
import { userModel } from '../models/User';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/error';

export class AuthService {
  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    const { email, name, password } = userData;

    logger.info(`Attempting to register user with email: ${email}`);

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      logger.warn(`Registration failed: Email already exists - ${email}`);
      throw createError(ERROR_MESSAGES.DUPLICATE_EMAIL, HTTP_STATUS.CONFLICT);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = randomUUID();
    const user = await userModel.create({
      id: userId,
      email,
      name,
      password,
      hashedPassword,
    });

    logger.info(`User registered successfully: ${email} (ID: ${userId})`);

    // Generate token
    const token = generateToken(user);

    return {
      user,
      token,
    };
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { email, password } = credentials;

    logger.info(`Attempting to login user with email: ${email}`);

    // Find user by email
    const userWithPassword = await userModel.findByEmail(email);
    if (!userWithPassword) {
      logger.warn(`Login failed: User not found - ${email}`);
      throw createError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, userWithPassword.hashedPassword);
    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid password - ${email}`);
      throw createError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    logger.info(`User logged in successfully: ${email} (ID: ${userWithPassword.id})`);

    // Remove password from response
    const { hashedPassword, ...user } = userWithPassword;

    // Generate token
    const token = generateToken(user);

    return {
      user,
      token,
    };
  }

  async getProfile(userId: string): Promise<User> {
    logger.debug(`Fetching profile for user ID: ${userId}`);

    const user = await userModel.findById(userId);
    if (!user) {
      logger.warn(`Profile fetch failed: User not found - ID: ${userId}`);
      throw createError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return user;
  }

  async updateProfile(userId: string, updates: Partial<Pick<User, 'name' | 'email'>>): Promise<User> {
    logger.info(`Updating profile for user ID: ${userId}`, { updates });

    const user = await userModel.update(userId, updates);
    if (!user) {
      logger.warn(`Profile update failed: User not found - ID: ${userId}`);
      throw createError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    logger.info(`Profile updated successfully for user ID: ${userId}`);
    return user;
  }
}

export const authService = new AuthService();