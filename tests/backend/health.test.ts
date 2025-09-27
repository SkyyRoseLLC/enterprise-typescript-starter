import request from 'supertest';

import app from '../../src/backend/app';
import { HTTP_STATUS } from '../../src/shared/constants';

describe('Health Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.uptime).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.version).toBeDefined();
      expect(response.body.data.environment).toBeDefined();
    });
  });

  describe('GET /', () => {
    it('should return API info', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Enterprise TypeScript Starter API');
    });
  });
});