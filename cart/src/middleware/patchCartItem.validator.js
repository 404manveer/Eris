import { body, param } from 'express-validator';

const patchCartItemValidator = [
  param('productId')
    .exists({ checkFalsy: true })
    .withMessage('productId is required')
    .isMongoId()
    .withMessage('productId must be a valid MongoId'),
  body('qty')
    .optional()
    .isInt()
    .withMessage('qty must be an integer'),
  body('quantity')
    .optional()
    .isInt()
    .withMessage('quantity must be an integer'),
  body().custom((value) => {
    if (value.qty == null && value.quantity == null) {
      throw new Error('qty or quantity is required');
    }

    return true;
  }),
];

export default patchCartItemValidator;
