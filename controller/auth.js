import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.js";
import { generateOtp } from "../middlewares/generateOtp.js";
import sendEmail from "../middlewares/email.js";
import ErrorHandler from "../middlewares/error.js";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res, message) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
  };

  res.cookie("token", token, cookieOptions);

  user.password = undefined;
  user.otp = undefined;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: { user },
  });
};

// Регистрация
export const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
      return next(new ErrorHandler("Заполните все поля!", 400));
  }

  // Проверка сложности пароля
  const passwordRegex = /^(?=.*\d)(?=.*[a-zA-Z])(?=.*[\W_]).{8,}$/;
  if (!passwordRegex.test(password)) {
      return next(new ErrorHandler("Пароль должен содержать минимум 8 символов, хотя бы одну букву, цифру и спецсимвол!", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
      return next(new ErrorHandler("Email уже используется!", 400));
  }

  const otp = generateOtp();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
  });

  try {
      await sendEmail({
          email: newUser.email,
          subject: "Подтверждение Email",
          html: `
              <div style="font-family: Arial, sans-serif; text-align: center;">
                  <h1>Подтверждение Email</h1>
                  <p>Ваш код OTP:</p>
                  <h2>${otp}</h2>
                  <p>Этот код действителен в течение 10 минут.</p>
              </div>
          `,
      });

      res.redirect(`/verify-otp?email=${email}`);
  } catch (error) {
      await User.findByIdAndDelete(newUser._id);
      return next(new ErrorHandler("Ошибка при отправке Email. Попробуйте еще раз.", 500));
  }
};


// Вход
export const loginUser = async (req, res) => {
  try {
      const user = await User.findOne({ email: req.body.email });

      if (!user) {
          return res.status(401).json({ error: "Неверные учетные данные" });
      }

      const isMatch = await bcrypt.compare(req.body.password, user.password);
      if (!isMatch) {
          return res.status(401).json({ error: "Неверные учетные данные" });
      }

      req.session.user = { _id: user._id, name: user.name };
      console.log("Пользователь вошел:", req.session.user); 

      res.redirect("/dashboard");
  } catch (error) {
      console.error("Ошибка входа:", error);
      res.status(500).send("Ошибка сервера");
  }
};



// Обновление пользователя
export const updateUser = async (req, res, next) => {
  const { name, password } = req.body;

  if (!name && !password) {
    return next(new ErrorHandler("No data provided for update!", 400));
  }

  const updates = {};
  if (name) updates.name = name;
  if (password) updates.password = await bcrypt.hash(password, 10);

  const updatedUser = await User.findByIdAndUpdate(req.userId, updates, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return next(new ErrorHandler("User not found!", 404));
  }

  updatedUser.password = undefined;

  res.status(200).json({
    success: true,
    message: "User updated successfully.",
    data: { user: updatedUser },
  });
};

// Удаление пользователя
export const deleteUser = async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.userId);

  if (!user) {
    return next(new ErrorHandler("User not found!", 404));
  }

  res.status(200).json({
    success: true,
    message: "User deleted successfully.",
  });
};

// Верификация OTP
export const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.query;

  if (!email || !otp) {
      return next(new ErrorHandler("Email and OTP are required!", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
      return next(new ErrorHandler("User not found!", 404));
  }

  if (user.otp !== otp || user.otpExpires < Date.now()) {
      return next(new ErrorHandler("Invalid or expired OTP!", 400));
  }

  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.redirect("/profile");
};


// Повторная отправка OTP
export const resendOtp = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler("Email is required to resend OTP", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const newOtp = generateOtp();
  user.otp = newOtp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      email: user.email,
      subject: "Resend OTP for Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h1>Resend OTP</h1>
          <p>Your new OTP code is:</p>
          <h2>${newOtp}</h2>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler("Failed to send OTP. Please try again.", 500));
  }
};
