import mongoose  from "mongoose";

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId,
         required: true
         },

   items:[
    {
        productId: { type: mongoose.Schema.Types.ObjectId, 
            required: true 
        },
        quantity: { type: Number,
             required: true
             },
    }
   ]
}, { timestamps: true });

const cartModel = mongoose.model("Cart", cartSchema);

export default cartModel;