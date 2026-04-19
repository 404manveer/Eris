import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB, clearDatabase } from './setup.js';
import jwt from 'jsonwebtoken';
import User from '../src/models/user.model.js';

// Mock Redis module
jest.mock('../src/db/redis.js', () => ({
  getRedisClient: jest.fn().mockResolvedValue({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(0),
  }),
  disconnectRedis: jest.fn().mockResolvedValue('OK'),
}));

describe('Auth - Me Endpoint', () => {
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

  describe('GET /api/auth/me', () => {
    it('should return user details when authenticated with valid token', async () => {
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

      // Get user details
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message', 'User details fetched successfully');
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toStrictEqual(
        expect.objectContaining({
          username: userData.username,
          email: userData.email,
          role: 'user',
        })
      );
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return 401 when token is invalid', async () => {
      const invalidToken = 'invalid.token.here';

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return 401 when token is expired', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: 'user123', username: 'testuser', role: 'user' },
        process.env.JWT_SECRET || 'secret-key',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return 401 when user does not exist in database', async () => {
      // Create a token for a non-existent user
      const fakeUserId = '507f1f77bcf86cd799439011'; // fake MongoDB ObjectId
      const token = jwt.sign(
        { id: fakeUserId, username: 'ghost', role: 'user' },
        process.env.JWT_SECRET || 'secret-key',
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });
  });
});
