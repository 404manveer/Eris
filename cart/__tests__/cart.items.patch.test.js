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

describe('PATCH /cart/items/:productId', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates item quantity and returns recalculated totals', async () => {
    const save = jest.fn().mockResolvedValue();
    CartModel.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [
        { productId: '64ca8e5fbe03c8a3f9e3e701', quantity: 2 },
        { productId: '64ca8e5fbe03c8a3f9e3e702', quantity: 1 },
      ],
      save,
    });

    productClient.getProductPricing
      .mockResolvedValueOnce({ amount: 100, currency: 'INR' })
      .mockResolvedValueOnce({ amount: 250, currency: 'INR' });

    const token = createAuthToken();

    const response = await request(app)
      .patch('/cart/items/64ca8e5fbe03c8a3f9e3e701')
      .set('Authorization', `Bearer ${token}`)
      .send({ qty: 4 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.totals.totalQuantity).toBe(5);
    expect(response.body.data.totals.grandTotal).toBe(650);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('removes item when qty is 0 and returns recalculated totals', async () => {
    const save = jest.fn().mockResolvedValue();
    CartModel.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [
        { productId: '64ca8e5fbe03c8a3f9e3e701', quantity: 2 },
        { productId: '64ca8e5fbe03c8a3f9e3e702', quantity: 3 },
      ],
      save,
    });

    productClient.getProductPricing.mockResolvedValueOnce({ amount: 250, currency: 'INR' });

    const token = createAuthToken();

    const response = await request(app)
      .patch('/cart/items/64ca8e5fbe03c8a3f9e3e701')
      .set('Authorization', `Bearer ${token}`)
      .send({ qty: 0 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].productId).toBe('64ca8e5fbe03c8a3f9e3e702');
    expect(response.body.data.totals.totalQuantity).toBe(3);
    expect(response.body.data.totals.grandTotal).toBe(750);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('removes item when qty is negative', async () => {
    const save = jest.fn().mockResolvedValue();
    CartModel.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [{ productId: '64ca8e5fbe03c8a3f9e3e701', quantity: 2 }],
      save,
    });

    const token = createAuthToken();

    const response = await request(app)
      .patch('/cart/items/64ca8e5fbe03c8a3f9e3e701')
      .set('Authorization', `Bearer ${token}`)
      .send({ qty: -5 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.totals.grandTotal).toBe(0);
    expect(save).toHaveBeenCalledTimes(1);
    expect(productClient.getProductPricing).not.toHaveBeenCalled();
  });

  it('returns 404 when item is not in cart', async () => {
    CartModel.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [{ productId: '64ca8e5fbe03c8a3f9e3e702', quantity: 1 }],
      save: jest.fn(),
    });

    const token = createAuthToken();

    const response = await request(app)
      .patch('/cart/items/64ca8e5fbe03c8a3f9e3e701')
      .set('Authorization', `Bearer ${token}`)
      .send({ qty: 2 });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('returns 422 when qty and quantity are both missing', async () => {
    const token = createAuthToken();

    const response = await request(app)
      .patch('/cart/items/64ca8e5fbe03c8a3f9e3e701')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });
});
