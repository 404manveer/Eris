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

describe('DELETE /cart/items/:productId', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes a line item and returns recalculated totals', async () => {
    const save = jest.fn().mockResolvedValue();
    CartModel.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [
        { productId: '64ca8e5fbe03c8a3f9e3e701', quantity: 2 },
        { productId: '64ca8e5fbe03c8a3f9e3e702', quantity: 1 },
      ],
      save,
    });

    productClient.getProductPricing.mockResolvedValueOnce({ amount: 250, currency: 'INR' });

    const token = createAuthToken();

    const response = await request(app)
      .delete('/cart/items/64ca8e5fbe03c8a3f9e3e701')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].productId).toBe('64ca8e5fbe03c8a3f9e3e702');
    expect(response.body.data.totals.totalQuantity).toBe(1);
    expect(response.body.data.totals.grandTotal).toBe(250);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when item is not found in cart', async () => {
    CartModel.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [{ productId: '64ca8e5fbe03c8a3f9e3e702', quantity: 1 }],
      save: jest.fn(),
    });

    const token = createAuthToken();

    const response = await request(app)
      .delete('/cart/items/64ca8e5fbe03c8a3f9e3e701')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('returns 422 for invalid productId', async () => {
    const token = createAuthToken();

    const response = await request(app)
      .delete('/cart/items/not-a-mongo-id')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });
});

describe('DELETE /cart', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears cart and returns empty totals', async () => {
    const save = jest.fn().mockResolvedValue();
    CartModel.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [{ productId: '64ca8e5fbe03c8a3f9e3e701', quantity: 2 }],
      save,
    });

    const token = createAuthToken();

    const response = await request(app)
      .delete('/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.totals.totalQuantity).toBe(0);
    expect(response.body.data.totals.grandTotal).toBe(0);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when cart does not exist', async () => {
    CartModel.findOne.mockResolvedValueOnce(null);

    const token = createAuthToken();

    const response = await request(app)
      .delete('/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.totals.grandTotal).toBe(0);
  });
});
