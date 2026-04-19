import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getRedisClient } from "../db/redis.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret-key";
const TOKEN_EXPIRY = "7d";
const TOKEN_BLACKLIST_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// Safe token blacklisting - fails gracefully if Redis unavailable
async function blacklistToken(token) {
  try {
    const redis = await getRedisClient();
    if (redis && typeof redis.set === 'function') {
      await redis.set(token, "blacklisted", "EX", TOKEN_BLACKLIST_TTL);
    }
  } catch (err) {
    // Log but don't fail logout if Redis unavailable
    console.warn('⚠ Token blacklist failed (Redis unavailable):', err.message);
  }
}

export const register = async (req, res) => {
  try {
    const { username, email, password, fullName = {} } = req.body;
    const { firstName = "", lastName = "" } = fullName;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: "Missing required fields: username, email, password",
        status: "error"
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ 
        message: "User already exists",
        status: "error"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      fullName: { firstName, lastName },
      role: "user",
    });

    await newUser.save();

    // Generate JWT
    const token = jwt.sign(
      {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.fullName,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
      status: "success",
      token,
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    return res.status(500).json({ 
      message: "Registration failed",
      status: "error"
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password required",
        status: "error"
      });
    }

    // Find user (must include password for comparison)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid credentials",
        status: "error"
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: "Invalid credentials",
        status: "error"
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
      status: "success",
      token,
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      message: "Login failed",
      status: "error"
    });
  }
};

export const me = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        message: "Unauthorized access",
        status: "error"
      });
    }

    return res.status(200).json({
      data: user,
      message: "User details fetched successfully",
      status: "success"
    });
  } catch (error) {
    console.error('❌ Me endpoint error:', error);
    return res.status(500).json({
      message: "Failed to fetch user details",
      status: "error"
    });
  }
};

export const logOut = async (req, res) => {
  try {
    // Safe token extraction
    const token = req.cookies?.token;
    
    // Blacklist token if present (but don't fail if Redis unavailable)
    if (token && typeof token === 'string') {
      await blacklistToken(token);
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "Logged out successfully",
      status: "success",
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    return res.status(500).json({
      message: "Logout failed",
      status: "error"
    });
  }
};

export const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { city, state, country, pinCode, street } = req.body;

    // Validate required fields
    if (!city || !state || !country) {
      return res.status(400).json({
        message: "Missing required fields: city, state, country",
        status: "error"
      });
    }

    // Find user and add address
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error"
      });
    }

    const newAddress = {
      city,
      state,
      country,
      pinCode: pinCode || "",
      street: street || "",
    };

    user.address.push(newAddress);
    await user.save();

    // Return the newly added address with its ID
    const addedAddress = user.address[user.address.length - 1];

    return res.status(201).json({
      data: addedAddress,
      message: "Address added successfully",
      status: "success"
    });
  } catch (error) {
    console.error('❌ Add address error:', error);
    return res.status(500).json({
      message: "Failed to add address",
      status: "error"
    });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user and get addresses
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error"
      });
    }

    return res.status(200).json({
      data: user.address || [],
      message: "Addresses fetched successfully",
      status: "success"
    });
  } catch (error) {
    console.error('❌ Get addresses error:', error);
    return res.status(500).json({
      message: "Failed to fetch addresses",
      status: "error"
    });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;

    // Validate addressId format
    if (!addressId || addressId.length !== 24) {
      return res.status(400).json({
        message: "Invalid address ID format",
        status: "error"
      });
    }

    // Find user and remove address
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: "error"
      });
    }

    // Find and remove the address
    const addressIndex = user.address.findIndex(
      (addr) => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        message: "Address not found",
        status: "error"
      });
    }

    user.address.splice(addressIndex, 1);
    await user.save();

    return res.status(200).json({
      message: "Address deleted successfully",
      status: "success"
    });
  } catch (error) {
    console.error('❌ Delete address error:', error);
    return res.status(500).json({
      message: "Failed to delete address",
      status: "error"
    });
  }
};
