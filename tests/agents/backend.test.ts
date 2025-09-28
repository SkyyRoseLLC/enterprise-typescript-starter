/**
 * Backend Agent Tests
 * Comprehensive test suite for backend agent functionality
 */

import {
  BackendAgent,
  AgentConfig,
  createBackendAgent,
} from '../../src/agents/api/core/src/agents/backend/BackendAgent';
import { createLogger } from '../../src/utils/logger';

describe('BackendAgent', () => {
  let agent: BackendAgent;
  let logger: ReturnType<typeof createLogger>;
  let config: AgentConfig;

  beforeEach(() => {
    logger = createLogger('TestAgent');
    config = {
      id: 'test-agent',
      name: 'Test Backend Agent',
      version: '1.0.0',
      timeout: 5000,
      retryCount: 2,
    };
    agent = new BackendAgent(config, logger);
  });

  afterEach(async () => {
    if (agent) {
      await agent.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
      expect(agent.getInfo()).toEqual(config);
    });

    it('should throw error if not initialized before execution', async () => {
      await expect(agent.execute('test')).rejects.toThrow('Agent not initialized');
    });
  });

  describe('Execution', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should execute successfully with string input', async () => {
      const result = await agent.execute('test input');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    it('should execute successfully with object input', async () => {
      const input = { test: 'data', number: 123 };
      const result = await agent.execute(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle execution errors gracefully', async () => {
      // Mock a scenario that would cause an error
      const originalProcessData = (agent as any).processData;
      (agent as any).processData = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await agent.execute('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.data).toBeUndefined();

      // Restore original method
      (agent as any).processData = originalProcessData;
    });
  });

  describe('Health Check', () => {
    it('should return true for healthy agent', async () => {
      await agent.initialize();
      const isHealthy = await agent.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Factory Functions', () => {
    it('should create agent with factory function', async () => {
      const createdAgent = await createBackendAgent(config, logger);
      expect(createdAgent).toBeInstanceOf(BackendAgent);
      expect(createdAgent.getInfo()).toEqual(config);
      await createdAgent.destroy();
    });
  });
});
