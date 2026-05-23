import express from 'express';
import jwt from "jsonwebtoken"

export function authmiddleware(role=['user']){

    return (req, res, next)=>{
      const jwtSecret = process.env.JWT_SECRET;

      const token = req.cookies.token || req.headers["authorization"]?.split(" ")[1];

      if(!token){
        return res.status(401).json({message:"Unauthorized"});
      }
      try {
        const decoded = jwt.verify(token,jwtSecret)
        if(!role.includes(decoded.role)){
          return res.status(403).json({message:"Forbidden"});
        }

        req.user = decoded;
        next();
        
      } catch (error) {
        return res.status(401).json({message:"Unauthorized"});
        
      }


    }
}