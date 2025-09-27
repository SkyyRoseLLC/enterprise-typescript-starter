import type { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

import { sendValidationError } from '../utils/response';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg as string);
      sendValidationError(res, errorMessages);
      return;
    }

    next();
  };
};