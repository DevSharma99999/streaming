import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    // Basic Information & Auth
    username: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true,
        index: true // Optimized for search
    },
    fullName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    password: { 
        type: String, 
        required: [true, "Password is required"],
        minlength: 6 
    },

    // Branding & UI
    avatar: { 
        type: String, 
        default: "" // Profile picture URL (Cloudinary)
    },
    coverImage: { 
        type: String, 
        default: "" // Channel banner URL
    },

    // Social & Relationships
    subscriptions: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }], 
    subscribers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }], 

    // Personal Library & Activity
    watchLater: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Video" 
    }],
    // In models/userModel.js
    history: [
    {
        video: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
        watchedAt: { type: Date, default: Date.now },
        watchedTime: { type: Number, default: 0 } // Store progress in seconds
    }
],
    likedVideos: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Video" 
    }],

    // System Messaging
    notifications: [{
        message: String,
        isRead: { type: Boolean, default: false },
        link: String,
        createdAt: { type: Date, default: Date.now }
    }],

    // Security
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpiry: Date,
    refreshToken: {
        type: String
    }
}, { timestamps: true });

// --- MIDDLEWARE: Hash password before saving ---
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return ;
    this.password = await bcrypt.hash(this.password, 10);
    // return next();
});

// --- METHOD: Verify password during login ---
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model("User", userSchema);