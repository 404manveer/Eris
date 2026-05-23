import mongoose  from "mongoose";

const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    price:{
        amount:{
            type:Number,
            required:true
        },
        currency:{
            type:String,
            enum:["USD","INR"],
            default:"INR"
        }
    },
    seller:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
    },
    images:{
        type:[String],
        required:true
    }
});

export const productModel = mongoose.model("Product",productSchema); 
