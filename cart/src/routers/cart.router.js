import express from 'express';
import  * as middlerware  from '../middleware/auth.middleware.js';
import * as Controller from '../controllers/cart.controller.js';

const router = express.Router();

// add item to cart
router.post("/addItem",middlerware.authMiddleware(),Controller.addItemToCart);


export default router;