import { body } from 'express-validator';

const addItemValidator = [
  body('productId')
    .exists({ checkFalsy: true })
    .withMessage('productId is required')
    .isMongoId()
    .withMessage('productId must be a valid MongoId'),
  body('qty')
    .optional()
    .isInt({ min: 1 })
    .withMessage('qty must be an integer greater than 0'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('quantity must be an integer greater than 0'),
  body().custom((value) => {
    if (value.qty == null && value.quantity == null) {
      throw new Error('qty or quantity is required');
    }

    return true;
  }),
];

export default addItemValidator;
