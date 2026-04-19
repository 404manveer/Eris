import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  city: String,
  state: String,
    country: String,
    pinCode: String,
    street: String,
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // Exclude by default - must explicitly select when needed
  },
  fullName: {
    firstName: String,
    lastName: String,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
  },
  address: [
    addressSchema,
  ],
});

const User = mongoose.model("user", userSchema);
export default User;
