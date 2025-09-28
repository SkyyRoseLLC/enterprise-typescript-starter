/**
 * Jest test setup file
 * Configures test environment and global test utilities
 */

import { createLogger } from '../src/utils/logger';

// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error'; // Reduce log noise during tests

// Create test logger
const testLogger = createLogger('TestSuite');

// Global test utilities
global.testLogger = testLogger;

// Mock external dependencies for testing
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (_req: any, _res: any, next: any) => next());
});

jest.mock('helmet', () => {
  return jest.fn(() => (_req: any, _res: any, next: any) => next());
});

// Setup test timeout
jest.setTimeout(10000);

// Global test helpers
declare global {
  var testLogger: ReturnType<typeof createLogger>;
}