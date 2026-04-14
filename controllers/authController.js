import { User } from "../models/userModel.js";
import { video as Video } from "../models/videoModel.js";
import jwt from "jsonwebtoken";
import { transporter } from "../utils/nodeMailer.js";
import validator from "validator";
import mongoose from "mongoose";

// --- HELPERS ---
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

/**
 * REGISTER USER with OTP
 * Checks for existing user, validates email, sends OTP
 */
export const registerUser = async (req, res) => {
    try {
        const { username, fullName, email, password } = req.body;

        if ([username, fullName, email, password].some((field) => field?.trim() === "")) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const existedUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existedUser) return res.status(409).json({ message: "User already exists" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

        await User.create({
            username: username.toLowerCase(),
            fullName,
            email,
            password,
            otp,
            otpExpiry,
            isVerified: false
        });

         transporter.sendMail({
            from: `"Valdora Team" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify your Valdora Account",
            html: `
                <div style="font-family: sans-serif; text-align: center; background: #0f0f0f; color: white; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #e11d48;">Welcome to Valdora</h2>
                    <p>Use the code below to verify your email:</p>
                    <div style="background: #1a1a1a; padding: 20px; border: 1px solid #e11d48; display: inline-block; border-radius: 8px;">
                        <h1 style="letter-spacing: 10px; font-size: 40px; margin: 0; color: #e11d48;">${otp}</h1>
                    </div>
                    <p style="margin-top: 20px; opacity: 0.7;">This code expires in 10 minutes.</p>
                </div>
            `
        }).catch((err) => {
            console.error("Email sending error:", err);
        });

        res.status(201).json({ success: true, message: "OTP sent to email!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * VERIFY OTP
 */
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isVerified) return res.status(400).json({ message: "Already verified" });

        if (user.otp !== otp || user.otpExpiry < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.status(200).json({ success: true, message: "Email verified successfully!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * LOGIN USER
 * Block if not verified
 */
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User does not exist" });

        if (!user.isVerified) {
            return res.status(403).json({ 
                success: false, 
                message: "Email not verified. Please check your inbox for an OTP." 
            });
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

        const token = generateToken(user._id);
        const userObj = { _id: user._id, username: user.username, email: user.email };

        return res.status(200)
            .cookie("token", token, cookieOptions)
            .json({ success: true, message: "Logged in successfully", data: userObj });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * LOGOUT USER
 */
export const logoutUser = async (req, res) => {
    try {
        return res.status(200)
            .clearCookie("token", cookieOptions)
            .json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * FORGOT PASSWORD (Actual Email)
 */
/**
 * FORGOT PASSWORD (OTP Version)
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

         transporter.sendMail({
            from: `"Valdora Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Password Reset OTP',
            html: `
                <div style="font-family: sans-serif; text-align: center; background: #0f0f0f; color: white; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #e11d48;">Reset Your Password</h2>
                    <p>Use the code below to reset your Valdora password:</p>
                    <div style="background: #1a1a1a; padding: 20px; border: 1px solid #e11d48; display: inline-block; border-radius: 8px;">
                        <h1 style="letter-spacing: 10px; font-size: 40px; margin: 0; color: #e11d48;">${otp}</h1>
                    </div>
                    <p style="margin-top: 20px; opacity: 0.7;">This code expires in 10 minutes.</p>
                </div>
            `
        }).catch((err) => {
            console.error("Email sending error:", err);
        }

        res.status(200).json({ success: true, message: 'OTP sent to your email!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * RESET PASSWORD (OTP Version)
 */
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify OTP
        if (user.otp !== otp || user.otpExpiry < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Update Password
        user.password = newPassword;
        user.otp = undefined; // Clear OTP after use
        user.otpExpiry = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET USER PROFILE
 * Includes String & ObjectId search and History management
 */
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const userIdString = userId.toString();

        const userProfile = await User.findById(userId).select("-password").lean();
        if (!userProfile) return res.status(404).json({ message: "User not found" });

        const videos = await mongoose.connection.db
            .collection("videos") 
            .find({ 
                $or: [{ owner: userIdString }, { owner: userId }] 
            }) 
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json({
            success: true,
            data: { ...userProfile, videos, totalVideos: videos.length }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};