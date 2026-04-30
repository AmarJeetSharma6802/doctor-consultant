import type { Request, Response } from "express"; //"verbatimModuleSyntax": true
//  import { Request, Response } from "express"; //normal import  "verbatimModuleSyntax": false
// // import user from "../model/user.model.js"

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../DB/primsa.ts";
import logger from "../utils/logger.ts";
import { redis } from "../config/redis.ts";

import transporter from "../utils/nodemailer.ts";

export const auth = async (req: Request, res: Response) => {
  try {
    const { name, email, password, otp, action } = req.body;
    console.log("REQ BODY:", req.body);

    /* ================= REGISTER ================= */
    if (action === "register") {
      if (!name || !email || !password) {
        logger.warn("Register failed: missing fields");
        return res.status(400).json({ message: "All fields required" });
      }

      const exists = await prisma.user.findUnique({ where: { email } });

      if (exists) {
        logger.warn(`Register failed: ${email} already exists`);
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otpCode, 10);

      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          // emailOtp: hashedOtp,
          // emailOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      await redis.set(`otp:${email}`, hashedOtp, { ex: 300 });

      await transporter.sendMail({
        to: email,
        subject: "Verify your email",
        html: `<h3>Your OTP is <b>${otpCode}</b></h3>`,
      });

      logger.info(`User registered: ${email}`);

      return res.status(201).json({
        message: "Registered successfully. OTP sent",
        next: "verify_otp",
      });
    }

    /* ================= VERIFY OTP ================= */
    if (action === "verify_otp") {
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP required" });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ message: "User not found" });

      // db setup
      // if (!user.emailOtp || user.emailOtpExpires! < new Date()) {
      //   return res.status(400).json({ message: "OTP expired" });
      // }

      // const isValid = await bcrypt.compare(otp, user.emailOtp);
      // if (!isValid) {
      //   logger.warn(`Invalid OTP attempt: ${email}`);
      //   return res.status(400).json({ message: "Invalid OTP" });
      // }

      // redis setup
      const storedOtp = await redis.get(`otp:${email}`);
      if (!storedOtp) return res.status(400).json({ message: "OTP expired" });

      const valid = await bcrypt.compare(otp, storedOtp as string);
      if (!valid) return res.status(400).json({ message: "Invalid OTP" });

      const accessToken = jwt.sign(
        { user_id: user.id },
        process.env.ACCESSTOKEN!,
        { expiresIn: "15m" },
      );

      const refreshToken = jwt.sign(
        { user_id: user.id },
        process.env.REFRESHTOKEN!,
        { expiresIn: "7d" },
      );

      await prisma.user.update({
        where: { email },
        data: {
          // emailOtp: null, db methods
          // emailOtpExpires: null,
          isVerified: true,
          refreshToken,
        },
      });

      res.cookie("accessToken", accessToken, { httpOnly: true });
      res.cookie("refreshToken", refreshToken, { httpOnly: true });

      logger.info(`OTP verified: ${email}`);

      return res.json({
        message: "OTP verified. Logged in",
      });
    }

    /* ================= LOGIN ================= */
    if (action === "login") {
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      //  attempts of login
      const attempts = await redis.incr(`login_attempt:${email}`);
      if (attempts === 1) await redis.expire(`login_attempt:${email}`, 600);

      if (attempts > 5)
        return res.status(429).json({ message: "Too many login attempts" });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.isVerified) {
        return res.status(404).json({ message: "User not verified" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.warn(`Invalid login attempt: ${email}`);
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // attempts delete
      await redis.del(`login_attempt:${email}`);

      const accessToken = jwt.sign({ user_id: user.id }, process.env.ACCESSTOKEN!, {
        expiresIn: "15m",
      });

      const refreshToken = jwt.sign(
        { user_id: user.id },
        process.env.REFRESHTOKEN!,
        { expiresIn: "7d" },
      );

      // for db
      await prisma.user.update({
        where: { email },
        data: { refreshToken },
      });

      // redis store session
      await redis.set(`session:${user.id}`, refreshToken, { ex: 604800 });

      res.cookie("accessToken", accessToken, { httpOnly: true });
      res.cookie("refreshToken", refreshToken, { httpOnly: true });

      logger.info(`Login success: ${email}`);

      return res.json({ message: "Login successful", user });
    }

    return res
      .status(400)
      .json({ message: "Invalid action", receivedAction: action });
  } catch (error) {
    logger.error(`Auth error: ${error}`);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ message: "name field required for update name" });
  }

  const updateUser = await prisma.user.update({
    where: {
      id: (req as any).user.id,
    },
    data: {
      name: name,
    },
  });

  return res.status(200).json({
    message: "Account updated successfully",
    user: updateUser,
  });
};

 export const changePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "password is field required" });
  }

  const user = await prisma.user.findUnique({
    where: { email: (req as any).user.email },
  });

  if (!user) {
    logger.warn(`user not found ${user}`);
    return res.status(400).json({ message: "user not found " });
  }

  const matchPass = await bcrypt.compare(oldPassword, user.password);
  logger.warn(`old password not match ${matchPass}`);
  if (!matchPass) {
    return res.status(400).json({ message: "Old password does not match" });
  }

  const saltPass = await bcrypt.genSalt(10)
  const hassNewPassword = await bcrypt.hash(newPassword,saltPass)

  user.password = hassNewPassword
  await prisma.user.update(
    {
      where:{id :user.id},
      data:{
        password:newPassword
      }
    }
  )

  return res.status(201).json({ message: "Password changed successfully"})
};

export const deleteAccount = async(req: Request, res: Response)=>{

  const userId = (req as any).user.id

   const deleteAcc = await prisma.user.delete({
    where: { id: userId }
  });

 return res.json({ message: "Account deleted successfully", deleteAcc });


}

export const fetchUser = async (req: Request, res: Response) => {
  const finsUser = await prisma.user.findMany();

  if (!finsUser) {
    logger.error(`Auth error: ${finsUser}`);
    return res.status(500).json({ message: "User not fetch " });
  }

  logger.info(`Users fetched successfully ${finsUser}`);

  return res.status(201).json({ message: "fetch succefully", finsUser });
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.status(200).json({
    message: "Current user fetched successfully",
    user,
  });
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESHTOKEN as string
    ) as { user_id: string };

    const storedToken = await redis.get(`session:${decoded.user_id}`);

    if (!storedToken) {
      return res.status(401).json({ message: "Session expired, please login again" });
    }

    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { user_id: decoded.user_id },
      process.env.ACCESSTOKEN as string,
      { expiresIn: "15m" }
    );

    res.cookie("accessToken", newAccessToken, { httpOnly: true });

    logger.info(`Access token refreshed for user: ${decoded.user_id}`);

    return res.json({ message: "Token refreshed successfully" });

  } catch (error) {
    logger.error("Refresh token error", error);
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

// Case	Return type
// return res.json() karte ho	Promise<Response>
// sirf res.json() call karte ho	Promise<void>

// Email isliye use karte hain taki pata chale:

// kaunsa OTP kis user ka hai

// Example:

// Key: otp:rahul@gmail.com
// Value: 7845 (hashed)



// import redis from "../redis"; // tumhara redis setup

// export const getCurrentUser = async (req: Request, res: Response) => {
//   const user = (req as any).user;

//   if (!user) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   const cacheKey = `user:${user._id}`;

//   try {
//     // 🔹 1. Redis check
//     const cachedUser = await redis.get(cacheKey);

//     if (cachedUser) {
//       console.log("Cache hit 🔥");
//       return res.status(200).json({
//         message: "User fetched from cache",
//         user: JSON.parse(cachedUser),
//       });
//     }

//     // 🔹 2. Agar middleware me full user nahi hai to DB fetch
//     // (optional — depends on your middleware)
//     // const dbUser = await User.findById(user._id);

//     // 🔹 3. Redis me store
//     await redis.set(cacheKey, JSON.stringify(user), "EX", 300);

//     console.log("Cache miss ⚠️");

//     return res.status(200).json({
//       message: "User fetched successfully",
//       user,
//     });

//   } catch (err) {
//     return res.status(500).json({ message: "Server error" });
//   }
// };