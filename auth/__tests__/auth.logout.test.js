import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB, clearDatabase } from './setup.js';
import User from '../src/models/user.model.js';
import { getRedisClient } from '../src/db/redis.js';

// Mock Redis module
jest.mock('../src/db/redis.js', () => ({
  getRedisClient: jest.fn().mockResolvedValue({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(0),
  }),
  disconnectRedis: jest.fn().mockResolvedValue('OK'),
}));

describe('Auth - Logout Endpoint', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      const token = loginResponse.body.token;

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should clear the token cookie on logout', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      // Register and login
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      const token = loginResponse.body.token;

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${token}`);

      // Check if Set-Cookie header exists with max-age=0 or expires in past
      const setCookieHeader = response.get('Set-Cookie');
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('token=');
    });

    it('should blacklist token in mock Redis on logout', async () => {
      const redisClient = require('../src/db/redis.js').default;

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      // Register and login
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      const token = loginResponse.body.token;

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${token}`);

      // Verify Redis set was called with blacklist token
      const redis = await getRedisClient();
      expect(redis.set).toHaveBeenCalledWith(
        token,
        'blacklisted',
        'EX',
        7 * 24 * 60 * 60
      );
    });

    it('should logout successfully even without token', async () => {
      // Logout without token should still clear cookie
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should allow logout with invalid token cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'token=invalid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
      expect(response.body).toHaveProperty('status', 'success');
    });
  });

  describe('Integration: Login -> Logout', () => {
    it('should complete logout flow successfully', async () => {
      const userData = {
        username: 'logoutuser',
        email: 'logout@example.com',
        password: 'password123',
      };

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);

      // Step 2: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.token;

      // Step 3: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${token}`);

      expect(logoutResponse.status).toBe(200);

      // Verify token is in Redis blacklist
      const redis = await getRedisClient();
      expect(redis.set).toHaveBeenCalledWith(
        token,
        'blacklisted',
        'EX',
        7 * 24 * 60 * 60
      );
    });
  });
});
