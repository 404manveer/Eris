import { param } from 'express-validator';

const deleteCartItemValidator = [
  param('productId')
    .exists({ checkFalsy: true })
    .withMessage('productId is required')
    .isMongoId()
    .withMessage('productId must be a valid MongoId'),
];

export default deleteCartItemValidator;
