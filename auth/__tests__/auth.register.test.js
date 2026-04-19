import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB, teardownTestDB, clearDatabase } from './setup.js';
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

describe('Auth - Register Endpoint', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        fullName: { firstName: 'John', lastName: 'Doe' },
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toStrictEqual(
        expect.objectContaining({
          username: userData.username,
          email: userData.email,
        })
      );

      // Verify user is in database
      const userInDB = await User.findOne({ email: userData.email }).select('+password');
      expect(userInDB).toBeDefined();
      expect(userInDB.username).toBe(userData.username);
    });

    it('should fail if email already exists', async () => {
      const userData = {
        username: 'testuser1',
        email: 'existing@example.com',
        password: 'password123',
      };

      // Register first user
      await request(app).post('/api/auth/register').send(userData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          email: userData.email,
          password: 'password456',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should fail if username already exists', async () => {
      const userData = {
        username: 'duplicateuser',
        email: 'user1@example.com',
        password: 'password123',
      };

      // Register first user
      await request(app).post('/api/auth/register').send(userData);

      // Try to register with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: userData.username,
          email: 'user2@example.com',
          password: 'password456',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should fail if username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should hash the password before storing', async () => {
      const userData = {
        username: 'hashtest',
        email: 'hash@example.com',
        password: 'plainPassword123',
      };

      await request(app).post('/api/auth/register').send(userData);

      const userInDB = await User.findOne({ email: userData.email }).select('+password');
      expect(userInDB.password).not.toBe(userData.password);
      expect(userInDB.password).toBeDefined();
      expect(userInDB.password.length).toBeGreaterThan(0);
    });

    it('should return a valid JWT token', async () => {
      const userData = {
        username: 'tokenuser',
        email: 'token@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
      
      // JWT should have 3 parts separated by dots
      const tokenParts = response.body.token.split('.');
      expect(tokenParts.length).toBe(3);
    });

    it('should set default role to user', async () => {
      const userData = {
        username: 'roletest',
        email: 'role@example.com',
        password: 'password123',
      };

      await request(app).post('/api/auth/register').send(userData);

      const userInDB = await User.findOne({ email: userData.email }).select('+password');
      expect(userInDB.role).toBe('user');
    });

    it('should handle fullName as optional', async () => {
      const userData = {
        username: 'noname',
        email: 'noname@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      
      const userInDB = await User.findOne({ email: userData.email });
      expect(userInDB).toBeDefined();
    });
  });
});
