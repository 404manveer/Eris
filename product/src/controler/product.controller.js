import express from 'express';
import {uploadFile} from '../services/imageket.service';
import { productModel } from '../model/product.model';

const createProductImage = async (req,res)=>{
    try {
        const { file } = req.files;
        const image = await uploadFile(file.name, file.data);
        res.status(200).json({message:"Image uploaded successfully", data:{status:"success", image}});   
         
    } catch (error) {
        res.status(500).json({ message: "Error creating product", data:{status:"fail", error} });
    }
}

const createProduct = async (req,res)=>{
    try {
        const {name,description,price,seller,images} = req.body;
        const product = await productModel.create({
            name,
            description,
            price,
            seller,
            images
        });
        if(!product){
            return res.status(400).json({message:"Error creating product", data:{status:"fail"}});
        }
        res.status(201).json({message:"Product created successfully", data:{status:"success", product}});

        
    } catch (error) {
        res.status(500).json({ message: "Error creating product", data:{status:"fail", error} });
        
    }
}

const getProductById = async (req,res)=>{
    const {id} = req.params;
    try {
        const product = await productModel.findById(id);
        if(!product){
            return res.status(404).json({message:"Product not found", data:{status:"fail"}});

        }
        res.status(200).json({message:"Product fetched successfully",
             data:{status:"success", product}
            });
        
    } catch (error) {
        res.status(500).json({message:"Error fetching product", data:{status:"fail", error}});
        
    }
}

const getAllProducts = async (req,res)=>{
    try {
        const products = await productModel.find();
        if(!products){
            return res.status(404).json({message:"No products found", data:{status:"fail"}});
        }
        res.status(200).json({message:"Products fetched successfully", data:{status:"success", products}});
    } catch (error) {
        res.status(500).json({ message: "Error fetching products", data:{status:"fail", error} });
    }
}

const deleteProduct = async (req,res)=>{
    try {
        const {id} = req.params;
        const product = await productModel.findByIdAndDelete(id);
        if(!product){
            return res.status(404).json({message:"Product not found", data:{status:"fail"}});
        }
        res.status(200).json({message:"Product deleted successfully", data:{status:"success", product}});
    } catch (error) {
        res.status(500).json({ message: "Error deleting product", data:{status:"fail", error} });
    }
}

const editProduct = async (req,res)=>{
    try {
        const {id} = req.params;
        const {name, description, price, seller, images} = req.body;
        const product = await productModel.findByIdAndUpdate(id, {
            name,
            description,
            price,
            seller,
            images
        }, { new: true });
        if(!product){
            return res.status(404).json({message:"Product not found", data:{status:"fail"}});
        }
        res.status(200).json({message:"Product updated successfully", data:{status:"success", product}});
    } catch (error) {
        res.status(500).json({ message: "Error editing product", data:{status:"fail", error} });
        
    }
}

const getSellerProducts = async (req,res)=>{
    try {
        const { sellerId } = req.params;
        const products = await productModel.find({ seller: sellerId });
        if(!products){
            return res.status(404).json({message:"No products found for this seller", data:{status:"fail"}});
        }
        res.status(200).json({message:"Seller products fetched successfully", data:{status:"success", products}});
    } catch (error) {
        res.status(500).json({ message: "Error fetching seller products", data:{status:"fail", error} });
    }
}

export {createProductImage, createProduct, getAllProducts, deleteProduct, editProduct, getSellerProducts, getProductById};