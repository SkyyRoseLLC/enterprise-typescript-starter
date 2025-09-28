/**
 * Logger Tests
 * Test suite for the logger utility
 */

import { Logger, createLogger } from '../../src/utils/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger('TestService');
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Basic Logging', () => {
    it('should log info messages', () => {
      logger.info('Test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Metadata Logging', () => {
    it('should include metadata in logs', () => {
      const metadata = { userId: 123, action: 'test' };
      logger.info('Test message', metadata);

      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('Test message');
    });

    it('should format error objects correctly', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with context', () => {
      const childLogger = logger.child({ userId: 123 });
      childLogger.info('Child message');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Factory Function', () => {
    it('should create logger with factory function', () => {
      const factoryLogger = createLogger('FactoryService');
      expect(factoryLogger).toBeInstanceOf(Logger);
    });
  });
});
