import express from 'express';
import  * as middlerware  from '../middleware/auth.middleware.js';
import * as Controller from '../controllers/cart.controller.js';
import validateRequest from '../middleware/validateRequest.js';
import addItemValidator from '../middleware/cartItem.validator.js';
import patchCartItemValidator from '../middleware/patchCartItem.validator.js';
import deleteCartItemValidator from '../middleware/deleteCartItem.validator.js';

const router = express.Router();

// add item to cart
router.post(
	'/items',
	middlerware.authMiddleware(['user']),
	addItemValidator,
	validateRequest,
	Controller.addItemToCart
);

// get cart items
router.get(
	'/',
	middlerware.authMiddleware(['user']),
	Controller.getCartItems
);

// patch cart item quantity (remove when qty <= 0)
router.patch(
	'/items/:productId',
	middlerware.authMiddleware(['user']),
	patchCartItemValidator,
	validateRequest,
	Controller.patchCartItem
);

// remove a line item from cart
router.delete(
	'/items/:productId',
	middlerware.authMiddleware(['user']),
	deleteCartItemValidator,
	validateRequest,
	Controller.deleteCartItem
);

// clear cart
router.delete(
	'/',
	middlerware.authMiddleware(['user']),
	Controller.clearCart
);



export default router;