import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB, clearDatabase } from './setup.js';
import User from '../src/models/user.model.js';
import bcrypt from 'bcryptjs';

// Mock Redis module
jest.mock('../src/db/redis.js', () => ({
  getRedisClient: jest.fn().mockResolvedValue({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(0),
  }),
  disconnectRedis: jest.fn().mockResolvedValue('OK'),
}));

describe('Auth - Login Endpoint', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('POST /api/auth/login', () => {
    it('should login a user successfully with valid credentials', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toStrictEqual(
        expect.objectContaining({
          username: userData.username,
          email: userData.email,
          role: 'user',
        })
      );
    });

    it('should fail login with incorrect password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to login with wrong password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should fail login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should fail login if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail login if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return a valid JWT token on successful login', async () => {
      const userData = {
        username: 'tokenuser',
        email: 'token@example.com',
        password: 'password123',
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      
      // JWT should have 3 parts separated by dots
      const tokenParts = response.body.token.split('.');
      expect(tokenParts.length).toBe(3);
    });

    it('should set token in cookie on successful login', async () => {
      const userData = {
        username: 'cookieuser',
        email: 'cookie@example.com',
        password: 'password123',
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=');
    });

    it('should return user data with role on successful login', async () => {
      const userData = {
        username: 'roleuser',
        email: 'role@example.com',
        password: 'password123',
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('user');
      expect(response.body.user.id).toBeDefined();
    });

    it('should return user with fullName if it was set during registration', async () => {
      const userData = {
        username: 'fullnameuser',
        email: 'fullname@example.com',
        password: 'password123',
        fullName: { firstName: 'John', lastName: 'Doe' },
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.user.fullName).toStrictEqual({
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should not return password field in response', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.user).not.toHaveProperty('password');
    });
  });
});
