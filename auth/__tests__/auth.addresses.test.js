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

describe('Auth - User Addresses Endpoints', () => {
  let token;
  let userId;
  const userData = {
    username: 'addressuser',
    email: 'address@example.com',
    password: 'password123',
  };

  const addressData = {
    city: 'New York',
    state: 'NY',
    country: 'USA',
    pinCode: '10001',
    street: '123 Main Street',
  };

  const addressData2 = {
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    pinCode: '90001',
    street: '456 Hollywood Blvd',
  };

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

  // Helper function to register and login
  const registerAndLogin = async () => {
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

    token = loginResponse.body.token;

    // Get userId from database
    const user = await User.findOne({ email: userData.email });
    userId = user._id;

    return token;
  };

  describe('POST /api/auth/user/me/addresses', () => {
    it('should create a new address when authenticated with valid data', async () => {
      await registerAndLogin();

      const response = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Address added successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toStrictEqual(
        expect.objectContaining({
          city: addressData.city,
          state: addressData.state,
          country: addressData.country,
          pinCode: addressData.pinCode,
          street: addressData.street,
        })
      );
    });

    it('should add multiple addresses for the same user', async () => {
      await registerAndLogin();

      // Add first address
      const response1 = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData);

      expect(response1.status).toBe(201);

      // Add second address
      const response2 = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData2);

      expect(response2.status).toBe(201);

      // Verify both addresses are saved
      const user = await User.findById(userId);
      expect(user.address).toHaveLength(2);
    });

    it('should return 400 when required fields are missing', async () => {
      await registerAndLogin();

      const incompleteAddress = {
        city: 'New York',
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(incompleteAddress);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/auth/user/me/addresses')
        .send(addressData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return 401 when token is invalid', async () => {
      const invalidToken = 'invalid.token.here';

      const response = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${invalidToken}`)
        .send(addressData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should allow empty optional fields in address', async () => {
      await registerAndLogin();

      const minimalAddress = {
        city: 'Boston',
        state: 'MA',
        country: 'USA',
      };

      const response = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(minimalAddress);

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          city: minimalAddress.city,
          state: minimalAddress.state,
          country: minimalAddress.country,
        })
      );
    });
  });

  describe('GET /api/auth/user/me/addresses', () => {
    it('should return all addresses for authenticated user', async () => {
      await registerAndLogin();

      // Add two addresses
      await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData);

      await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData2);

      // Get all addresses
      const response = await request(app)
        .get('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Addresses fetched successfully');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toStrictEqual(
        expect.objectContaining({
          city: addressData.city,
          state: addressData.state,
        })
      );
      expect(response.body.data[1]).toStrictEqual(
        expect.objectContaining({
          city: addressData2.city,
          state: addressData2.state,
        })
      );
    });

    it('should return empty array when user has no addresses', async () => {
      await registerAndLogin();

      const response = await request(app)
        .get('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toEqual([]);
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/user/me/addresses');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return 401 when token is invalid', async () => {
      const invalidToken = 'invalid.token.here';

      const response = await request(app)
        .get('/api/auth/user/me/addresses')
        .set('Cookie', `token=${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should only return addresses for the authenticated user', async () => {
      // Register and login first user
      await registerAndLogin();

      // Add address for first user
      await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData);

      // Register and login second user
      const userData2 = {
        username: 'addressuser2',
        email: 'address2@example.com',
        password: 'password123',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData2);

      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData2.email,
          password: userData2.password,
        });

      const token2 = loginResponse2.body.token;

      // Second user should have empty addresses
      const response = await request(app)
        .get('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token2}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('DELETE /api/auth/user/me/addresses/:addressId', () => {
    it('should delete an address by ID when authenticated', async () => {
      await registerAndLogin();

      // Add an address
      const addResponse = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData);

      const addressId = addResponse.body.data._id;

      // Delete the address
      const deleteResponse = await request(app)
        .delete(`/api/auth/user/me/addresses/${addressId}`)
        .set('Cookie', `token=${token}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('status', 'success');
      expect(deleteResponse.body).toHaveProperty('message', 'Address deleted successfully');

      // Verify address is deleted
      const user = await User.findById(userId);
      expect(user.address).toHaveLength(0);
    });

    it('should delete only the specified address when user has multiple', async () => {
      await registerAndLogin();

      // Add two addresses
      const addResponse1 = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData);

      const addResponse2 = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData2);

      const addressId1 = addResponse1.body.data._id;
      const addressId2 = addResponse2.body.data._id;

      // Delete first address
      const deleteResponse = await request(app)
        .delete(`/api/auth/user/me/addresses/${addressId1}`)
        .set('Cookie', `token=${token}`);

      expect(deleteResponse.status).toBe(200);

      // Verify only second address remains
      const user = await User.findById(userId);
      expect(user.address).toHaveLength(1);
      expect(user.address[0].city).toBe(addressData2.city);
    });

    it('should return 404 when address ID does not exist', async () => {
      await registerAndLogin();

      const fakeAddressId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/auth/user/me/addresses/${fakeAddressId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when address ID format is invalid', async () => {
      await registerAndLogin();

      const invalidAddressId = 'not-a-valid-id';

      const response = await request(app)
        .delete(`/api/auth/user/me/addresses/${invalidAddressId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 401 when no token is provided', async () => {
      const addressId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/auth/user/me/addresses/${addressId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should return 401 when token is invalid', async () => {
      const invalidToken = 'invalid.token.here';
      const addressId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/auth/user/me/addresses/${addressId}`)
        .set('Cookie', `token=${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should not allow user to delete another user\'s address', async () => {
      // Register and login first user
      await registerAndLogin();

      // Add address for first user
      const addResponse = await request(app)
        .post('/api/auth/user/me/addresses')
        .set('Cookie', `token=${token}`)
        .send(addressData);

      const addressId = addResponse.body.data._id;

      // Register and login second user
      const userData2 = {
        username: 'addressuser2',
        email: 'address2@example.com',
        password: 'password123',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData2);

      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData2.email,
          password: userData2.password,
        });

      const token2 = loginResponse2.body.token;

      // Try to delete first user's address with second user's token
      const deleteResponse = await request(app)
        .delete(`/api/auth/user/me/addresses/${addressId}`)
        .set('Cookie', `token=${token2}`);

      expect(deleteResponse.status).toBe(404);

      // Verify first user's address still exists
      const user1 = await User.findById(userId);
      expect(user1.address).toHaveLength(1);
    });
  });
});
