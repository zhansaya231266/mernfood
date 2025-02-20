import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  otp: { type: String },
  otpExpires: { type: Date },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'admin']
  },
  createdAt: { type: Date, default: Date.now, expires: "30d" }
});

export const User = mongoose.model("User", userSchema);