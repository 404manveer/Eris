import { validationResult } from 'express-validator';
import {
  createProductValidator,
  editProductValidator,
  deleteProductValidator,
} from '../../validators/product.validators';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_MONGO_ID = '507f1f77bcf86cd799439011';
const VALID_URL      = 'https://cdn.example.com/product.jpg';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a fresh Express-compatible req.
 * body / params are deep-copied so mutations between tests are isolated.
 */
const makeReq = ({ body = {}, params = {} } = {}) => ({
  body:    { ...body },
  params:  { ...params },
  query:   {},
  headers: {},
  cookies: {},
});

/**
 * Runs every item in a validator array against req.
 * Handles both express-validator chains (.run) and plain Express middlewares.
 */
const runValidators = async (req, validators) => {
  for (const v of validators) {
    if (v && typeof v.run === 'function') {
      await v.run(req);
    } else if (typeof v === 'function') {
      await new Promise((resolve) => v(req, {}, resolve));
    }
  }
  return validationResult(req);
};

/** Filters the raw error array for a specific field path. */
const errorsFor = (result, field) =>
  result.array().filter((e) => e.path === field);

// ─── createProductValidator ───────────────────────────────────────────────────

describe('createProductValidator', () => {
  const validBody = () => ({
    name:        'Widget Pro',
    description: 'A solid product',
    price:       { amount: 99.99 },
    seller:      VALID_MONGO_ID,
    images:      [VALID_URL],
  });

  // ── happy path ──

  test('passes with a fully valid payload', async () => {
    const req    = makeReq({ body: validBody() });
    const result = await runValidators(req, createProductValidator);
    expect(result.isEmpty()).toBe(true);
  });

  test('passes when price.currency is omitted (field is optional)', async () => {
    const req    = makeReq({ body: validBody() });
    const result = await runValidators(req, createProductValidator);
    expect(result.isEmpty()).toBe(true);
  });

  test('passes when price.currency is "USD"', async () => {
    const req    = makeReq({ body: { ...validBody(), price: { amount: 10, currency: 'USD' } } });
    const result = await runValidators(req, createProductValidator);
    expect(result.isEmpty()).toBe(true);
  });

  test('passes when price.currency is "INR"', async () => {
    const req    = makeReq({ body: { ...validBody(), price: { amount: 10, currency: 'INR' } } });
    const result = await runValidators(req, createProductValidator);
    expect(result.isEmpty()).toBe(true);
  });

  // ── name ──

  test('fails when name is missing', async () => {
    const body = validBody();
    delete body.name;
    const result = await runValidators(makeReq({ body }), createProductValidator);
    expect(errorsFor(result, 'name').length).toBeGreaterThan(0);
  });

  test('fails when name is only whitespace', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), name: '   ' } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'name').length).toBeGreaterThan(0);
  });

  test('fails when name is shorter than 2 characters', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), name: 'X' } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'name').length).toBeGreaterThan(0);
  });

  // ── description ──

  test('fails when description is missing', async () => {
    const body = validBody();
    delete body.description;
    const result = await runValidators(makeReq({ body }), createProductValidator);
    expect(errorsFor(result, 'description').length).toBeGreaterThan(0);
  });

  test('fails when description is empty string', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), description: '' } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'description').length).toBeGreaterThan(0);
  });

  // ── price.amount ──

  test('fails when price.amount is missing', async () => {
    const body = validBody();
    delete body.price;
    const result = await runValidators(makeReq({ body }), createProductValidator);
    expect(errorsFor(result, 'price.amount').length).toBeGreaterThan(0);
  });

  test('fails when price.amount is zero', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), price: { amount: 0 } } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'price.amount').length).toBeGreaterThan(0);
  });

  test('fails when price.amount is negative', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), price: { amount: -10 } } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'price.amount').length).toBeGreaterThan(0);
  });

  test('fails when price.amount is a non-numeric string', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), price: { amount: 'free' } } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'price.amount').length).toBeGreaterThan(0);
  });

  // ── price.currency ──

  test('fails when price.currency is an unsupported code', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), price: { amount: 10, currency: 'EUR' } } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'price.currency').length).toBeGreaterThan(0);
  });

  // ── seller ──

  test('fails when seller is missing', async () => {
    const body = validBody();
    delete body.seller;
    const result = await runValidators(makeReq({ body }), createProductValidator);
    expect(errorsFor(result, 'seller').length).toBeGreaterThan(0);
  });

  test('fails when seller is not a valid MongoId', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), seller: 'not-an-objectid' } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'seller').length).toBeGreaterThan(0);
  });

  // ── images ──

  test('fails when images is missing', async () => {
    const body = validBody();
    delete body.images;
    const result = await runValidators(makeReq({ body }), createProductValidator);
    expect(errorsFor(result, 'images').length).toBeGreaterThan(0);
  });

  test('fails when images is an empty array', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), images: [] } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'images').length).toBeGreaterThan(0);
  });

  test('fails when an image item is not a valid URL', async () => {
    const result = await runValidators(
      makeReq({ body: { ...validBody(), images: ['not-a-url'] } }),
      createProductValidator,
    );
    expect(errorsFor(result, 'images[0]').length).toBeGreaterThan(0);
  });

  // ── mass-assignment protection ──

  test('strips unknown fields from req.body', async () => {
    const req = makeReq({ body: { ...validBody(), malicious: 'drop table', _admin: true } });
    await runValidators(req, createProductValidator);
    expect(req.body).not.toHaveProperty('malicious');
    expect(req.body).not.toHaveProperty('_admin');
  });

  test('preserves all allowed fields after whitelist', async () => {
    const req = makeReq({ body: validBody() });
    await runValidators(req, createProductValidator);
    expect(req.body).toHaveProperty('name');
    expect(req.body).toHaveProperty('description');
    expect(req.body).toHaveProperty('price');
    expect(req.body).toHaveProperty('seller');
    expect(req.body).toHaveProperty('images');
  });
});

// ─── editProductValidator ─────────────────────────────────────────────────────

describe('editProductValidator', () => {
  const validParams = () => ({ id: VALID_MONGO_ID });
  const validBody   = () => ({ name: 'Updated Widget', price: { amount: 49.99 } });

  // ── happy path ──

  test('passes with a valid id and a partial body', async () => {
    const req    = makeReq({ params: validParams(), body: validBody() });
    const result = await runValidators(req, editProductValidator);
    expect(result.isEmpty()).toBe(true);
  });

  test('passes with a valid id and an empty body (all fields optional)', async () => {
    const req    = makeReq({ params: validParams(), body: {} });
    const result = await runValidators(req, editProductValidator);
    expect(result.isEmpty()).toBe(true);
  });

  // ── id param ──

  test('fails when id is missing', async () => {
    const req    = makeReq({ params: {}, body: validBody() });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'id').length).toBeGreaterThan(0);
  });

  test('fails when id is not a valid MongoId', async () => {
    const req    = makeReq({ params: { id: 'invalid-id' }, body: validBody() });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'id').length).toBeGreaterThan(0);
  });

  test('error message for invalid id mentions ObjectId', async () => {
    const req    = makeReq({ params: { id: 'bad' }, body: {} });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'id')[0].msg).toMatch(/ObjectId/i);
  });

  // ── optional body fields ──

  test('fails when name is provided but shorter than 2 characters', async () => {
    const req    = makeReq({ params: validParams(), body: { name: 'X' } });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'name').length).toBeGreaterThan(0);
  });

  test('fails when price.amount is provided but zero', async () => {
    const req    = makeReq({ params: validParams(), body: { price: { amount: 0 } } });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'price.amount').length).toBeGreaterThan(0);
  });

  test('fails when price.amount is provided but negative', async () => {
    const req    = makeReq({ params: validParams(), body: { price: { amount: -5 } } });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'price.amount').length).toBeGreaterThan(0);
  });

  test('fails when seller is provided but not a valid MongoId', async () => {
    const req    = makeReq({ params: validParams(), body: { seller: 'bad-id' } });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'seller').length).toBeGreaterThan(0);
  });

  test('passes when seller is a valid MongoId', async () => {
    const req    = makeReq({ params: validParams(), body: { seller: VALID_MONGO_ID } });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'seller').length).toBe(0);
  });

  test('fails when an image URL is invalid', async () => {
    const req    = makeReq({ params: validParams(), body: { images: ['not-a-url'] } });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'images[0]').length).toBeGreaterThan(0);
  });

  test('passes when images contains a valid URL', async () => {
    const req    = makeReq({ params: validParams(), body: { images: [VALID_URL] } });
    const result = await runValidators(req, editProductValidator);
    expect(errorsFor(result, 'images[0]').length).toBe(0);
  });

  // ── mass-assignment protection ──

  test('strips unknown fields from req.body', async () => {
    const req = makeReq({ params: validParams(), body: { ...validBody(), secret: 'hack' } });
    await runValidators(req, editProductValidator);
    expect(req.body).not.toHaveProperty('secret');
  });
});

// ─── deleteProductValidator ───────────────────────────────────────────────────

describe('deleteProductValidator', () => {
  test('passes with a valid MongoId', async () => {
    const req    = makeReq({ params: { id: VALID_MONGO_ID } });
    const result = await runValidators(req, deleteProductValidator);
    expect(result.isEmpty()).toBe(true);
  });

  test('fails when id is not a valid MongoId', async () => {
    const req    = makeReq({ params: { id: 'not-valid' } });
    const result = await runValidators(req, deleteProductValidator);
    expect(errorsFor(result, 'id').length).toBeGreaterThan(0);
  });

  test('fails when id is missing from params', async () => {
    const req    = makeReq({ params: {} });
    const result = await runValidators(req, deleteProductValidator);
    expect(errorsFor(result, 'id').length).toBeGreaterThan(0);
  });

  test('error message mentions ObjectId', async () => {
    const req    = makeReq({ params: { id: 'garbage' } });
    const result = await runValidators(req, deleteProductValidator);
    expect(errorsFor(result, 'id')[0].msg).toMatch(/ObjectId/i);
  });

  test('does not touch req.body', async () => {
    const req = makeReq({ params: { id: VALID_MONGO_ID }, body: { name: 'x' } });
    await runValidators(req, deleteProductValidator);
    expect(req.body).toHaveProperty('name', 'x');
  });
});
