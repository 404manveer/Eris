import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import CartModel from '../src/models/cart.model.js';
import * as productClient from '../src/services/product.client.js';

jest.mock('../src/models/cart.model.js', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { findOne: jest.fn() }),
}));

jest.mock('../src/services/product.client.js', () => {
  const getProductPricing = jest.fn();

  return {
    __esModule: true,
    default: { getProductPricing },
    getProductPricing,
  };
});

function createAuthToken() {
  return jwt.sign(
    { id: '507f1f77bcf86cd799439011', role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('GET /cart', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty cart when cart does not exist', async () => {
    CartModel.findOne.mockResolvedValueOnce(null);

    const token = createAuthToken();

    const response = await request(app)
      .get('/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.totals.grandTotal).toBe(0);
    expect(productClient.getProductPricing).not.toHaveBeenCalled();
  });

  it('recomputes totals using Product Service pricing', async () => {
    CartModel.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [
        { productId: '64ca8e5fbe03c8a3f9e3e701', quantity: 2 },
        { productId: '64ca8e5fbe03c8a3f9e3e702', quantity: 1 },
      ],
    });

    productClient.getProductPricing
      .mockResolvedValueOnce({ amount: 100, currency: 'INR' })
      .mockResolvedValueOnce({ amount: 250, currency: 'INR' });

    const token = createAuthToken();

    const response = await request(app)
      .get('/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.totals.totalQuantity).toBe(3);
    expect(response.body.data.totals.grandTotal).toBe(450);
    expect(response.body.data.totals.currency).toBe('INR');
    expect(productClient.getProductPricing).toHaveBeenCalledTimes(2);
  });

  it('returns 502 when Product Service pricing fails', async () => {
    CartModel.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [{ productId: '64ca8e5fbe03c8a3f9e3e701', quantity: 2 }],
    });

    productClient.getProductPricing.mockRejectedValueOnce(new Error('service unavailable'));

    const token = createAuthToken();

    const response = await request(app)
      .get('/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(502);
    expect(response.body.success).toBe(false);
  });
});
