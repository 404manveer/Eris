import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';

const mockSave = jest.fn();

const CartModelMock = jest.fn().mockImplementation((data) => ({
  ...data,
  save: mockSave,
}));

CartModelMock.findOne = jest.fn();

jest.mock('../src/models/cart.model.js', () => ({
  __esModule: true,
  default: CartModelMock,
}));

// Contract-level mock for stock validation/reservation to avoid any product DB usage.
const mockStockClient = {
  checkAvailability: jest.fn(),
  reserveSoftStock: jest.fn(),
};

jest.mock(
  '../src/services/stock.client.js',
  () => ({
    __esModule: true,
    default: mockStockClient,
    checkAvailability: mockStockClient.checkAvailability,
    reserveSoftStock: mockStockClient.reserveSoftStock,
  }),
  { virtual: true }
);

function createAuthToken() {
  return jwt.sign(
    { id: '507f1f77bcf86cd799439011', role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('POST /cart/items', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds item when product is available and qty is valid', async () => {
    CartModelMock.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [],
      save: mockSave,
    });

    mockStockClient.checkAvailability.mockResolvedValueOnce({ available: true });
    mockStockClient.reserveSoftStock.mockResolvedValueOnce({ reserved: true });

    const token = createAuthToken();

    const response = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: '64ca8e5fbe03c8a3f9e3e701',
        qty: 2,
        reserveSoftStock: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('returns 422 when qty is invalid', async () => {
    const token = createAuthToken();

    const response = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: '64ca8e5fbe03c8a3f9e3e701',
        qty: 0,
      });

    expect(response.status).toBe(422);
  });

  it('returns 422 when productId is missing', async () => {
    const token = createAuthToken();

    const response = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        qty: 1,
      });

    expect(response.status).toBe(422);
  });

  it('returns 409 when product is unavailable', async () => {
    mockStockClient.checkAvailability.mockResolvedValueOnce({ available: false });

    const token = createAuthToken();

    const response = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: '64ca8e5fbe03c8a3f9e3e701',
        qty: 5,
      });

    expect(response.status).toBe(409);
    expect(CartModelMock.findOne).not.toHaveBeenCalled();
  });

  it('does not reserve soft stock when reserveSoftStock is false', async () => {
    CartModelMock.findOne.mockResolvedValueOnce({
      userId: '507f1f77bcf86cd799439011',
      items: [],
      save: mockSave,
    });

    mockStockClient.checkAvailability.mockResolvedValueOnce({ available: true });

    const token = createAuthToken();

    const response = await request(app)
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: '64ca8e5fbe03c8a3f9e3e701',
        qty: 1,
        reserveSoftStock: false,
      });

    expect(response.status).toBe(200);
    expect(mockStockClient.reserveSoftStock).not.toHaveBeenCalled();
  });
});
