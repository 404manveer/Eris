import express from 'express';
import jwt from "jsonwebtoken"

export function authMiddleware(role=['user']){

    return (req, res, next)=>{
      const jwtSecret = process.env.JWT_SECRET;

      const token = req.cookies.token || req.headers["authorization"]?.split(" ")[1];

      if(!token){
        return res.status(401).json({
          message:"Unauthorized",
        sucess:false
      });
      }
      try {
        const decoded = jwt.verify(token,jwtSecret)
        if(!role.includes(decoded.role)){
          return res.status(403).json({
            message:"Forbidden",
             sucess:false
            });
        }

        req.user = decoded;
        next();
        
      } catch (error) {
        return res.status(401).json({
          message:"Unauthorized",
           sucess:false
          });
      }


    }
}