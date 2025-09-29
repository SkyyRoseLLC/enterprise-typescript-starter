import { body, param, query } from 'express-validator';

import { VALIDATION_MESSAGES } from '../../shared/constants';

export const getUserValidation = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
];

export const updateUserValidation = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage(VALIDATION_MESSAGES.EMAIL_INVALID),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(`${VALIDATION_MESSAGES.NAME_MIN_LENGTH} and ${VALIDATION_MESSAGES.NAME_MAX_LENGTH}`),
];

export const deleteUserValidation = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
];

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];