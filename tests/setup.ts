// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Global test timeout
jest.setTimeout(10000);