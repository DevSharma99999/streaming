// import { User } from "../models/userModel.js";
// import jwt from "jsonwebtoken";
// import validator from "validator";
// import mongoose from "mongoose";
// import { sendValdoraEmail } from "../utils/email.js";

// // --- HELPERS ---
// // --- UPDATED HELPERS ---
// const generateToken = (id) => {
//     return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
// };

// const cookieOptions = {
//     httpOnly: true,
//     // MUST BE TRUE for sameSite: "none" to work
//     secure: true, 
//     // MUST BE "none" for Vercel to communicate with Render
//     sameSite: "none", 
//     maxAge: 30 * 24 * 60 * 60 * 1000 
// };

// /**
//  * REGISTER USER
//  */
// export const registerUser = async (req, res) => {
//     try {
//         const { username, fullName, email, password } = req.body;

//         if ([username, fullName, email, password].some((field) => field?.trim() === "")) {
//             return res.status(400).json({ message: "All fields are required" });
//         }

//         if (!validator.isEmail(email)) {
//             return res.status(400).json({ message: "Invalid email format" });
//         }

//         const existedUser = await User.findOne({ $or: [{ username }, { email }] });
//         if (existedUser) return res.status(409).json({ message: "User already exists" });

//         const otp = Math.floor(100000 + Math.random() * 900000).toString();
//         const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

//         await User.create({
//             username: username.toLowerCase(),
//             fullName,
//             email,
//             password,
//             otp,
//             otpExpiry,
//             isVerified: false
//         });

//         // Background Email Trigger (Non-blocking)
//         sendValdoraEmail(email, otp, "Verify your Valdora Account")
//             .catch(err => console.error("Registration Email Failed:", err));

//         res.status(201).json({ success: true, message: "OTP sent to email!" });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// /**
//  * VERIFY OTP
//  */
// export const verifyOTP = async (req, res) => {
//     try {
//         const { email, otp } = req.body;
//         const user = await User.findOne({ email });

//         if (!user) return res.status(404).json({ message: "User not found" });
//         if (user.isVerified) return res.status(400).json({ message: "Already verified" });

//         if (user.otp !== otp || user.otpExpiry < Date.now()) {
//             return res.status(400).json({ message: "Invalid or expired OTP" });
//         }

//         user.isVerified = true;
//         user.otp = undefined;
//         user.otpExpiry = undefined;
//         await user.save();

//         res.status(200).json({ success: true, message: "Email verified successfully!" });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// /**
//  * LOGIN USER
//  */
// export const loginUser = async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const user = await User.findOne({ email });

//         if (!user) return res.status(404).json({ message: "User does not exist" });

//         if (!user.isVerified) {
//             return res.status(403).json({ 
//                 success: false, 
//                 message: "Email not verified. Please check your inbox for an OTP." 
//             });
//         }

//         const isPasswordValid = await user.isPasswordCorrect(password);
//         if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

//         const token = generateToken(user._id);
//         const userObj = { _id: user._id, username: user.username, email: user.email };

//         return res.status(200)
//             .cookie("token", token, cookieOptions)
//             .json({ success: true, message: "Logged in successfully", data: userObj });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// /**
//  * LOGOUT USER
//  */
// export const logoutUser = async (req, res) => {
//     try {
//         return res.status(200)
//             .clearCookie("token", cookieOptions)
//             .json({ success: true, message: "Logged out successfully" });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// /**
//  * FORGOT PASSWORD
//  */
// export const forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     console.log("========== FORGOT PASSWORD ==========");
//     console.log("Email:", email);

//     const user = await User.findOne({
//       email: email.trim().toLowerCase()
//     });

//     console.log("User found:", !!user);

//     if (!user) {
//       return res.status(404).json({
//         message: "User not found"
//       });
//     }

//     const otp = Math.floor(
//       100000 + Math.random() * 900000
//     ).toString();

//     const otpExpiry = new Date(
//       Date.now() + 10 * 60 * 1000
//     );

//     user.otp = otp;
//     user.otpExpiry = otpExpiry;

//     await user.save();

//     console.log("OTP generated:", otp);
//     console.log("OTP expiry:", otpExpiry);

//    try {
//     const result = await sendValdoraEmail(
//         email,
//         otp,
//         "Your Password Reset OTP"
//     );

//     if (!result.success) {
//         console.error("❌ EMAIL FAILED");

//         return res.status(500).json({
//             success: false,
//             message: "Failed to send OTP email"
//         });
//     }

//     console.log("✅ EMAIL SENT SUCCESSFULLY");

//     return res.status(200).json({
//         success: true,
//         message: "OTP sent to your email!"
//     });

// } catch (emailError) {
//     console.error("❌ EMAIL FAILED:", emailError);

//     return res.status(500).json({
//         success: false,
//         message: "Failed to send OTP email"
//     });
// }
// };

// /**
//  * RESET PASSWORD
//  */
// export const resetPassword = async (req, res) => {
//     try {
//         const { email, otp, newPassword } = req.body;
//         const user = await User.findOne({ email });

//         if (!user) return res.status(404).json({ message: 'User not found' });

//         if (user.otp !== otp || user.otpExpiry < Date.now()) {
//             return res.status(400).json({ message: "Invalid or expired OTP" });
//         }

//         user.password = newPassword;
//         user.otp = undefined;
//         user.otpExpiry = undefined;
//         await user.save();

//         res.status(200).json({ success: true, message: 'Password reset successfully' });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// /**
//  * GET USER PROFILE
//  */
// export const getUserProfile = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         const userProfile = await User.findById(userId).select("-password").lean();
        
//         if (!userProfile) return res.status(404).json({ message: "User not found" });

//         const videos = await mongoose.connection.db
//             .collection("videos") 
//             .find({ owner: userId }) // Cleaned up for standard ObjectId search
//             .sort({ createdAt: -1 })
//             .toArray();

//         res.status(200).json({
//             success: true,
//             data: { ...userProfile, videos, totalVideos: videos.length }
//         });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

import { User } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import validator from "validator";
import mongoose from "mongoose";
import { sendValdoraEmail } from "../utils/email.js";

// HELPERS

const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
};

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000
};

// REGISTER USER

export const registerUser = async (req, res) => {
    try {
        const { username, fullName, email, password } = req.body;

        if (
            [username, fullName, email, password]
                .some((field) => !field || field.trim() === "")
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username.trim().toLowerCase();

        if (!validator.isEmail(normalizedEmail)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const existedUser = await User.findOne({
            $or: [
                { username: normalizedUsername },
                { email: normalizedEmail }
            ]
        });

        if (existedUser) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const otpExpiry = new Date(
            Date.now() + 10 * 60 * 1000
        );

        // Create user
        await User.create({
            username: normalizedUsername,
            fullName: fullName.trim(),
            email: normalizedEmail,
            password,
            otp,
            otpExpiry,
            isVerified: false
        });

        // Send email
        try {
            const result = await sendValdoraEmail(
                normalizedEmail,
                otp,
                "Verify your Valdora Account"
            );

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to send verification email"
                });
            }

            console.log("✅ Registration OTP email sent");

        } catch (emailError) {
            console.error(
                "❌ Registration email failed:",
                emailError
            );

            return res.status(500).json({
                success: false,
                message: "Failed to send verification email"
            });
        }

        return res.status(201).json({
            success: true,
            message: "OTP sent to email!"
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// VERIFY OTP

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: "Already verified"
            });
        }

        if (
            user.otp !== otp ||
            !user.otpExpiry ||
            user.otpExpiry.getTime() < Date.now()
        ) {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Email verified successfully!"
        });

    } catch (error) {
        console.error("VERIFY OTP ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// LOGIN USER

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(404).json({
                message: "User does not exist"
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Email not verified. Please check your inbox for an OTP."
            });
        }

        const isPasswordValid =
            await user.isPasswordCorrect(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = generateToken(user._id);

        const userObj = {
            _id: user._id,
            username: user.username,
            email: user.email
        };

        return res
            .status(200)
            .cookie("token", token, cookieOptions)
            .json({
                success: true,
                message: "Logged in successfully",
                data: userObj
            });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// LOGOUT USER

export const logoutUser = async (req, res) => {
    try {
        return res
            .status(200)
            .clearCookie("token", cookieOptions)
            .json({
                success: true,
                message: "Logged out successfully"
            });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// FORGOT PASSWORD

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        console.log("========== FORGOT PASSWORD ==========");
        console.log("Email:", normalizedEmail);

        const user = await User.findOne({
            email: normalizedEmail
        });

        console.log("User found:", !!user);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        const otpExpiry = new Date(
            Date.now() + 10 * 60 * 1000
        );

        console.log("OTP generated:", otp);
        console.log("OTP expiry:", otpExpiry);

        // IMPORTANT:
        // Send email FIRST.
        // Only save OTP if Brevo succeeds.

        const result = await sendValdoraEmail(
            normalizedEmail,
            otp,
            "Your Password Reset OTP"
        );

        if (!result || !result.success) {
            console.error("❌ OTP EMAIL FAILED");

            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email"
            });
        }

        // Email successfully sent.
        // Now save OTP in database.

        user.otp = otp;
        user.otpExpiry = otpExpiry;

        await user.save();

        console.log("✅ OTP saved to database");
        console.log("✅ EMAIL SENT SUCCESSFULLY");

        return res.status(200).json({
            success: true,
            message: "OTP sent to your email!"
        });

    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send OTP email"
        });
    }
};


// RESET PASSWORD

export const resetPassword = async (req, res) => {
    try {
        const {
            email,
            otp,
            newPassword
        } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP and new password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (
            user.otp !== otp ||
            !user.otpExpiry ||
            user.otpExpiry.getTime() < Date.now()
        ) {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        user.password = newPassword;
        user.otp = undefined;
        user.otpExpiry = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// GET USER PROFILE

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const userProfile = await User
            .findById(userId)
            .select("-password")
            .lean();

        if (!userProfile) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const videos = await mongoose.connection.db
            .collection("videos")
            .find({
                owner: userId
            })
            .sort({
                createdAt: -1
            })
            .toArray();

        return res.status(200).json({
            success: true,
            data: {
                ...userProfile,
                videos,
                totalVideos: videos.length
            }
        });

    } catch (error) {
        console.error("GET PROFILE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};