import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { getRedisClient } from "../db/redis.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret-key";

// Check if token is blacklisted (fails open if Redis unavailable)
async function isTokenBlacklisted(token) {
  try {
    const redis = await getRedisClient();
    if (redis && typeof redis.get === 'function') {
      const blacklisted = await redis.get(token);
      return blacklisted === "blacklisted";
    }
  } catch (err) {
    console.warn('⚠ Blacklist check failed (Redis unavailable):', err.message);
  }
  return false; // Fail open - allow access if Redis down
}

export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ 
        message: "Unauthorized access - no token",
        status: "error"
      });
    }

    // Verify JWT signature
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        message: "Unauthorized access - invalid token",
        status: "error"
      });
    }

    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ 
        message: "Unauthorized access - token revoked",
        status: "error"
      });
    }

    // Fetch user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        message: "Unauthorized access - user not found",
        status: "error"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({ 
      message: "Authentication failed",
      status: "error"
    });
  }
};