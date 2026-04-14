import mongoose from "mongoose";
import { User } from "../models/userModel.js";

export const clearWatchHistory = async (req, res) => {
    try {
        await User.findByIdAndUpdate(
            req.user._id,
            { $set: { history: [] } },
            { returnDocument: 'after' }
        );

        res.status(200).json({
            success: true,
            message: "Watch history cleared successfully"
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Ensure this import exists!

export const getWatchHistory = async (req, res) => {
    try {
        // Now 'User' will be defined
        const user = await User.findById(req.user._id)
            .populate({
                path: "history.video",
                populate: { path: "owner", select: "username avatar" }
            });

        res.status(200).json({
            success: true,
            data: user.history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getWatchLater = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: "watchLater",
                populate: { path: "owner", select: "username avatar" }
            });

        return res.status(200).json({
            success: true,
            data: user.watchLater
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// New Controller to save progress
export const updateWatchProgress = async (req, res) => {
    try {
        const { videoId, watchedTime } = req.body;
        const userId = req.user._id;
        if (watchedTime === undefined) return res.status(400).send();
        // Update the 'watchedTime' for the most recent entry of this video
        await User.updateOne(
            { _id: userId, "history.video": videoId },
            { 
                $set: { 
                    "history.$.watchedTime": watchedTime, 
                    "history.$.watchedAt": new Date() 
                } 
            }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
import { Subscription } from "../models/subscriptionModel.js";

export const getUserSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ subscriber: req.user._id }).populate("channel", "username avatar");
        const channels = subscriptions.map((sub) => ({
            id: sub.channel._id,
            username: sub.channel.username,
            avatar: sub.channel.avatar
        }));

        res.status(200).json({ success: true, data: channels });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleSubscription = async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user._id;

        // Validate channelId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ message: "Invalid channel ID" });
        }

        // Prevent subscribing to yourself
        if (channelId === userId.toString()) {
            return res.status(400).json({ message: "You cannot subscribe to yourself" });
        }

        // Check if the channel (user) exists
        const channelExists = await User.findById(channelId);
        if (!channelExists) {
            return res.status(404).json({ message: "Channel not found" });
        }

        const existingSub = await Subscription.findOne({
            subscriber: userId,
            channel: channelId
        });

        if (existingSub) {
            await Subscription.findByIdAndDelete(existingSub._id);
            return res.status(200).json({ success: true, subscribed: false });
        } else {
            await Subscription.create({
                subscriber: userId,
                channel: channelId
            });
            return res.status(200).json({ success: true, subscribed: true });
        }
    } catch (error) {
        console.error("Toggle subscription error:", error);
        res.status(500).json({ message: error.message });
    }
};
export const checkSubscriptionStatus = async (req, res) => {
    try {
        const { channelId } = req.params;
        const userId = req.user._id;

        // Validate channelId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ isSubscribed: false });
        }

        // Check if the channel (user) exists
        const channelExists = await User.findById(channelId);
        if (!channelExists) {
            return res.status(404).json({ isSubscribed: false });
        }

        const sub = await Subscription.findOne({
            subscriber: userId,
            channel: channelId
        });

        res.status(200).json({ isSubscribed: !!sub });
    } catch (error) {
        console.error("Check subscription error:", error);
        res.status(500).json({ message: error.message });
    }
};

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Helper to handle the upload and cleanup (since you want to avoid a separate utils file)
const uploadToCloudinary = async (localPath, folder) => {
    try {
        const result = await cloudinary.uploader.upload(localPath, {
            folder: folder,
            resource_type: "image"
        });
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath); // Cleanup temp file
        console.log("Cloudinary URL:", result.secure_url); // ✅ ADD THIS
        return result.secure_url;
    } catch (error) {
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        console.error("Cloudinary upload error:", error); // 👈 ADD THIS
        return null;
    }
};


export const updateUserAvatar = async (req, res) => {
    try {
        const avatarLocalPath = req.file?.path;

        if (!avatarLocalPath) {
            return res.status(400).json({ message: "Avatar file missing" });
        }

        const avatarUrl = await uploadToCloudinary(avatarLocalPath, "user_avatars");

        if (!avatarUrl) {
            return res.status(500).json({ message: "Cloudinary upload failed" });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { avatar: avatarUrl } },
            { new: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error("Avatar update error:", error);
        res.status(500).json({ message: error.message });
    }
};
export const updateUserCoverImage = async (req, res) => {
    try {
        const coverLocalPath = req.file?.path;

        if (!coverLocalPath) {
            return res.status(400).json({ message: "Cover image missing" });
        }

        const coverUrl = await uploadToCloudinary(coverLocalPath, "user_covers");

        if (!coverUrl) {
            return res.status(500).json({ message: "Cloudinary upload failed" });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { coverImage: coverUrl } },
            { new: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error("Cover update error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateAccountDetails = async (req, res) => {
    const { fullName, email } = req.body;
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { fullName, email } },
        { new: true }
    ).select("-password");

    res.status(200).json({ success: true, data: user });
};