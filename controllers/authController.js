import { User } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import validator from "validator";
import mongoose from "mongoose";
import { sendValdoraEmail } from "../utils/email.js";

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
 * REGISTER USER
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

        // Background Email Trigger (Non-blocking)
        sendValdoraEmail(email, otp, "Verify your Valdora Account")
            .catch(err => console.error("Registration Email Failed:", err));

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
 * FORGOT PASSWORD
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        // Background Email Trigger (Non-blocking)
        sendValdoraEmail(email, otp, "Your Password Reset OTP")
            .catch(err => console.error("Reset Email Failed:", err));

        res.status(200).json({ success: true, message: 'OTP sent to your email!' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * RESET PASSWORD
 */
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.otp !== otp || user.otpExpiry < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        user.password = newPassword;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET USER PROFILE
 */
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const userProfile = await User.findById(userId).select("-password").lean();
        
        if (!userProfile) return res.status(404).json({ message: "User not found" });

        const videos = await mongoose.connection.db
            .collection("videos") 
            .find({ owner: userId }) // Cleaned up for standard ObjectId search
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