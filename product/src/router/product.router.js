import express from 'express';
import * as productMiddleware from '../middleware/authmiddleware';
import * as productcontroller from '../controler/product.controller';
import validateRequest from '../middleware/validateRequest';
import {
  createProductValidator,
  editProductValidator,
  deleteProductValidator,
} from '../validators/product.validators';

const router = express.Router();

// product api  /api/products

// create product
router.post("/",
    productMiddleware.authmiddleware(role=['admin',"seller"]),
    createProductValidator,
    validateRequest,
    productcontroller.createProduct
)

// get all products
router.get("/",
    productMiddleware.authmiddleware(),
    productcontroller.getAllProducts
)

// get product by id
router.get("/:id",productMiddleware.authmiddleware(),productcontroller.getProductById)

// delete product
router.delete("/:id",
    productMiddleware.authmiddleware(role=['admin',"seller"]),
    deleteProductValidator,
    validateRequest,
    productcontroller.deleteProduct
)

// edit product
router.patch("/:id",
    productMiddleware.authmiddleware(role=['admin',"seller"]),
    editProductValidator,
    validateRequest,
    productcontroller.editProduct
)

// get seller products
router.get("/seller/products",
    productMiddleware.authmiddleware(role=['seller']),
    productcontroller.getSellerProducts
)