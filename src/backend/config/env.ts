import { config } from 'dotenv';
import Joi from 'joi';

// Load environment variables
config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('0.0.0.0'),
  
  // Security
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().default(12),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  CORS_CREDENTIALS: Joi.boolean().default(true),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  ENABLE_REQUEST_LOGGING: Joi.boolean().default(true),
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const env = {
  NODE_ENV: envVars.NODE_ENV as 'development' | 'production' | 'test',
  PORT: envVars.PORT as number,
  HOST: envVars.HOST as string,
  
  // Security
  JWT_SECRET: envVars.JWT_SECRET as string,
  JWT_EXPIRES_IN: envVars.JWT_EXPIRES_IN as string,
  BCRYPT_ROUNDS: envVars.BCRYPT_ROUNDS as number,
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: envVars.RATE_LIMIT_WINDOW_MS as number,
  RATE_LIMIT_MAX_REQUESTS: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  
  // CORS
  CORS_ORIGIN: envVars.CORS_ORIGIN as string,
  CORS_CREDENTIALS: envVars.CORS_CREDENTIALS as boolean,
  
  // Logging
  LOG_LEVEL: envVars.LOG_LEVEL as string,
  ENABLE_REQUEST_LOGGING: envVars.ENABLE_REQUEST_LOGGING as boolean,
  
  // Computed values
  IS_PRODUCTION: envVars.NODE_ENV === 'production',
  IS_DEVELOPMENT: envVars.NODE_ENV === 'development',
  IS_TEST: envVars.NODE_ENV === 'test',
};