import { body } from 'express-validator';
import validateRequest from '../../middleware/validateRequest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a minimal Express-compatible req, runs the given chain against it,
 * and returns the populated req ready for validateRequest to inspect.
 */
const buildReq = async (bodyData, chain) => {
  const req = {
    body: { ...bodyData },
    params: {},
    query: {},
    headers: {},
    cookies: {},
  };
  await chain.run(req);
  return req;
};

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('validateRequest middleware', () => {
  const passingChain = body('email').isEmail().withMessage('Invalid email format');
  const failingChain = body('email').isEmail().withMessage('Invalid email format');

  test('calls next() when there are no validation errors', async () => {
    const req  = await buildReq({ email: 'user@example.com' }, passingChain);
    const res  = mockRes();
    const next = jest.fn();

    validateRequest(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('does NOT call next() when validation fails', async () => {
    const req  = await buildReq({ email: 'not-an-email' }, failingChain);
    const res  = mockRes();
    const next = jest.fn();

    validateRequest(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  test('returns HTTP 422 on validation failure', async () => {
    const req = await buildReq({ email: 'bad' }, failingChain);
    const res = mockRes();

    validateRequest(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
  });

  test('response body is { success: false, errors: [{ field, message }] }', async () => {
    const req = await buildReq({ email: 'bad' }, failingChain);
    const res = mockRes();

    validateRequest(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errors: [{ field: 'email', message: 'Invalid email format' }],
    });
  });

  test('each error object exposes ONLY field and message — no internal metadata', async () => {
    const chain = body('name').notEmpty().withMessage('name is required');
    const req   = await buildReq({}, chain);
    const res   = mockRes();

    validateRequest(req, res, jest.fn());

    const payload = res.json.mock.calls[0][0];
    payload.errors.forEach((err) => {
      expect(Object.keys(err)).toEqual(['field', 'message']);
    });
  });

  test('collects all field errors, not just the first one', async () => {
    const req = {
      body: { email: 'bad', name: '' },
      params: {}, query: {}, headers: {}, cookies: {},
    };
    await body('email').isEmail().withMessage('Invalid email').run(req);
    await body('name').notEmpty().withMessage('name required').run(req);

    const res = mockRes();
    validateRequest(req, res, jest.fn());

    const { errors } = res.json.mock.calls[0][0];
    expect(errors.length).toBe(2);
  });
});
