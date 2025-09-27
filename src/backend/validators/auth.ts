import { body } from 'express-validator';

import { VALIDATION_MESSAGES } from '../../shared/constants';

export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage(VALIDATION_MESSAGES.EMAIL_INVALID),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(`${VALIDATION_MESSAGES.NAME_MIN_LENGTH} and ${VALIDATION_MESSAGES.NAME_MAX_LENGTH}`),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage(VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(VALIDATION_MESSAGES.PASSWORD_STRONG),
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage(VALIDATION_MESSAGES.EMAIL_INVALID),
  
  body('password')
    .notEmpty()
    .withMessage(VALIDATION_MESSAGES.REQUIRED),
];

export const updateProfileValidation = [
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