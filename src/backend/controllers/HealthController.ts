import type { Request, Response } from 'express';

import type { HealthCheckResponse } from '../../shared/types';
import { asyncHandler } from '../middleware/error';
import { sendSuccess } from '../utils/response';

export class HealthController {
  healthCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const healthData: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    sendSuccess(res, healthData, 'Service is healthy');
  });
}

export const healthController = new HealthController();