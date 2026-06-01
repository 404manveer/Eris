import cartModel     from "../models/cart.model.js";
import * as stockClient from '../services/stock.client.js';
import * as productClient from '../services/product.client.js';

function buildEmptyCartPayload() {
    return {
        items: [],
        totals: {
            itemsCount: 0,
            totalQuantity: 0,
            grandTotal: 0,
            currency: null,
            totalsByCurrency: {},
        },
    };
}

async function buildCartPayload(cart, authHeader) {
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
        return buildEmptyCartPayload();
    }

    const pricedItems = await Promise.all(
        cart.items.map(async (item) => {
            const productId = item.productId.toString();
            const quantity = Number(item.quantity);

            const pricing = await productClient.getProductPricing({
                productId,
                authHeader,
            });

            const subtotal = Number((pricing.amount * quantity).toFixed(2));

            return {
                productId,
                quantity,
                unitPrice: {
                    amount: pricing.amount,
                    currency: pricing.currency,
                },
                subtotal,
            };
        })
    );

    const totalsByCurrency = pricedItems.reduce((acc, item) => {
        const currency = item.unitPrice.currency || 'UNKNOWN';
        acc[currency] = Number(((acc[currency] || 0) + item.subtotal).toFixed(2));
        return acc;
    }, {});

    const currencies = Object.keys(totalsByCurrency);
    const hasSingleCurrency = currencies.length === 1;
    const totalQuantity = pricedItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
        items: pricedItems,
        totals: {
            itemsCount: pricedItems.length,
            totalQuantity,
            grandTotal: hasSingleCurrency ? totalsByCurrency[currencies[0]] : null,
            currency: hasSingleCurrency ? currencies[0] : null,
            totalsByCurrency,
        },
    };
}


export async function addItemToCart(req, res) {
    try {
        const userId = req.user.id;
        const { productId, quantity, qty } = req.body;
        const itemQty = Number(quantity ?? qty);
        const shouldReserveSoftStock = req.body.reserveSoftStock === true;

        const availability = await stockClient.checkAvailability({
            productId,
            qty: itemQty,
        });

        if (!availability?.available) {
            return res.status(409).json({
                success: false,
                message: 'Requested quantity is not available',
            });
        }

        if (shouldReserveSoftStock) {
            await stockClient.reserveSoftStock({
                userId,
                productId,
                qty: itemQty,
            });
        }

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            cart = new cartModel({
                userId,
                items: [{productId, quantity: itemQty}],
            });
        }else{
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

            if(itemIndex > -1){
                cart.items[itemIndex].quantity += itemQty;
            }else{
                cart.items.push({productId, quantity: itemQty});
            }
        }

        await cart.save();
        res.status(200).json({
            success:true,
             message: "Item added to cart successfully", 
             data:cart 
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to add item to cart',
        });
    }
};

// get cart items
export async function getCartItems(req, res) {
    try {
        const userId = req.user.id;
        const cart = await cartModel.findOne({ userId });

        const data = await buildCartPayload(cart, req.headers.authorization);

        return res.status(200).json({
            success: true,
            message: 'Cart fetched successfully',
            data,
        });
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: 'Failed to fetch cart with latest product prices',
        });
    }
}

export async function patchCartItem(req, res) {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const { quantity, qty } = req.body;
        const nextQty = Number(quantity ?? qty);

        const cart = await cartModel.findOne({ userId });

        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found',
            });
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found',
            });
        }

        const shouldRemoveItem = nextQty <= 0;
        if (shouldRemoveItem) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = nextQty;
        }

        await cart.save();

        try {
            const data = await buildCartPayload(cart, req.headers.authorization);
            return res.status(200).json({
                success: true,
                message: shouldRemoveItem
                    ? 'Item removed from cart successfully'
                    : 'Cart item quantity updated successfully',
                data,
            });
        } catch (error) {
            return res.status(502).json({
                success: false,
                message: 'Failed to fetch cart with latest product prices',
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to update cart item',
        });
    }
}

export async function deleteCartItem(req, res) {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        const cart = await cartModel.findOne({ userId });

        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found',
            });
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.productId.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found',
            });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        try {
            const data = await buildCartPayload(cart, req.headers.authorization);

            return res.status(200).json({
                success: true,
                message: 'Item removed from cart successfully',
                data,
            });
        } catch (error) {
            return res.status(502).json({
                success: false,
                message: 'Failed to fetch cart with latest product prices',
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to remove cart item',
        });
    }
}

export async function clearCart(req, res) {
    try {
        const userId = req.user.id;
        const cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: 'Cart cleared successfully',
                data: buildEmptyCartPayload(),
            });
        }

        cart.items = [];
        await cart.save();

        return res.status(200).json({
            success: true,
            message: 'Cart cleared successfully',
            data: buildEmptyCartPayload(),
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to clear cart',
        });
    }
}


// 





