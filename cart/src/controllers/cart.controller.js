import cartModel     from "../models/cart.model.js";


export async function addItemToCart(req, res) {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            cart = new cartModel({
                userId,
                items: [{productId, quantity}],
            });
        }else{
            const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

            if(itemIndex > -1){
                cart.items[itemIndex].quantity += quantity;
            }else{
                cart.items.push({productId, quantity});
            }
        }

        await cart.save();
        res.status(200).json({
            success:true,
             message: "Item added to cart successfully", 
             data:cart 
            });
    } catch (error) {
        
    }
};


// 





