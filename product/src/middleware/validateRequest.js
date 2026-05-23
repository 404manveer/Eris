import { validationResult } from 'express-validator';

/**
 * Custom error formatter — exposes only field + message.
 * Internal validator metadata never reaches the client.
 */
const errorFormatter = ({ path, msg }) => ({
  field: path,
  message: msg,
});

/**
 * Generic validation gate.
 * Place this after every validation chain array in a route.
 * Aborts the request with 422 and a structured error body if any
 * chain reported a failure; otherwise hands control to the controller.
 *
 * @example
 * router.post('/products', createProductValidator, validateRequest, createProduct);
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult.withDefaults({ formatter: errorFormatter })(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array(),
    });
  }

  next();
};

export default validateRequest;
