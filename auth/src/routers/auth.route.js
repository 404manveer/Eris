import express from 'express';
import { register, login, me, logOut, addAddress, getAddresses, deleteAddress } from '../controllers/auth.controller.js';
import { Validation } from '../middleware/validator.middleware.js';
import {authenticateToken} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post('/register', Validation.registerValidation, register);
router.post('/login', Validation.loginValidation, login);
router.get('/me',authenticateToken,me)
router.post("/logout",logOut)

// Address endpoints
router.post('/user/me/addresses', authenticateToken, addAddress);
router.get('/user/me/addresses', authenticateToken, getAddresses);
router.delete('/user/me/addresses/:addressId', authenticateToken, deleteAddress);

export default router;
