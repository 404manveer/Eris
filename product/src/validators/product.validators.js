import { body, param } from 'express-validator';

// ─── Reusable primitives ──────────────────────────────────────────────────────

/**
 * Validates a MongoDB ObjectId in req.params.
 * Bail immediately so downstream checks don't run on a garbage value.
 */
const mongoIdParam = (field = 'id') =>
  param(field)
    .notEmpty()
    .bail()
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId`);

// ─── Mass-assignment protection ───────────────────────────────────────────────

/**
 * Strips any req.body key not present in `allowed`.
 * Must be the first item in every body-accepting validator array so that
 * stripped keys are gone before the validation chains run.
 */
const whitelistBody = (allowed) => (req, _res, next) => {
  for (const key of Object.keys(req.body)) {
    if (!allowed.includes(key)) {
      delete req.body[key];
    }
  }
  next();
};

/** Fields actually destructured in createProduct / editProduct controllers. */
const PRODUCT_FIELDS = ['name', 'description', 'price', 'seller', 'images'];

// ─── Reusable field-level chains ──────────────────────────────────────────────

/** name — required variant */
const nameRequired = body('name')
  .trim()
  .notEmpty().withMessage('name is required')
  .bail()
  .isLength({ min: 2 }).withMessage('name must be at least 2 characters');

/** name — optional variant (PUT) */
const nameOptional = body('name')
  .optional()
  .trim()
  .isLength({ min: 2 }).withMessage('name must be at least 2 characters');

/** description — required variant */
const descriptionRequired = body('description')
  .trim()
  .notEmpty().withMessage('description is required')
  .bail()
  .isString().withMessage('description must be a string');

/** description — optional variant (PUT) */
const descriptionOptional = body('description')
  .optional()
  .trim()
  .isString().withMessage('description must be a string');

/** price.amount — required variant */
const priceAmountRequired = body('price.amount')
  .notEmpty().withMessage('price.amount is required')
  .bail()
  .isFloat({ gt: 0 }).withMessage('price.amount must be a positive number');

/** price.amount — optional variant (PUT) */
const priceAmountOptional = body('price.amount')
  .optional()
  .isFloat({ gt: 0 }).withMessage('price.amount must be a positive number');

/** price.currency — always optional (model has a default) */
const priceCurrency = body('price.currency')
  .optional()
  .isIn(['USD', 'INR']).withMessage('price.currency must be one of: USD, INR');

/** seller ObjectId — required variant */
const sellerRequired = body('seller')
  .notEmpty().withMessage('seller is required')
  .bail()
  .isMongoId().withMessage('seller must be a valid MongoDB ObjectId');

/** seller ObjectId — optional variant (PUT) */
const sellerOptional = body('seller')
  .optional()
  .isMongoId().withMessage('seller must be a valid MongoDB ObjectId');

/** images array — required variant */
const imagesRequired = [
  body('images')
    .notEmpty().withMessage('images is required')
    .bail()
    .isArray({ min: 1 }).withMessage('images must be a non-empty array'),
  body('images.*')
    .isURL().withMessage('each image must be a valid URL'),
];

/** images array — optional variant (PUT) */
const imagesOptional = [
  body('images')
    .optional()
    .isArray({ min: 1 }).withMessage('images must be a non-empty array'),
  body('images.*')
    .optional()
    .isURL().withMessage('each image must be a valid URL'),
];

// ─── Composed validator arrays ────────────────────────────────────────────────

/**
 * POST /products
 * Validates all fields that createProduct destructures from req.body.
 */
export const createProductValidator = [
  whitelistBody(PRODUCT_FIELDS),
  nameRequired,
  descriptionRequired,
  priceAmountRequired,
  priceCurrency,
  sellerRequired,
  ...imagesRequired,
];

/**
 * PUT /products/:id
 * All body fields are optional; id param must be a valid MongoId.
 */
export const editProductValidator = [
  mongoIdParam('id'),
  whitelistBody(PRODUCT_FIELDS),
  nameOptional,
  descriptionOptional,
  priceAmountOptional,
  priceCurrency,
  sellerOptional,
  ...imagesOptional,
];

/**
 * DELETE /products/:id
 */
export const deleteProductValidator = [
  mongoIdParam('id'),
];
