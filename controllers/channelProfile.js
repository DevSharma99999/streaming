import { Subscription } from "../models/subscriptionModel.js"; // Ensure this import exists
import mongoose from "mongoose";
import { User } from "../models/userModel.js";

export const getChannelProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const loggedInUserId = req.user?._id; // Middleware should provide this if user is logged in

        if (!username?.trim()) {
            return res.status(400).json({ message: "Username missing" });
        }

        // 1. Find the Channel User
        const channel = await User.findOne({ username: username.toLowerCase() })
            .select("-password")
            .lean();

        if (!channel) return res.status(404).json({ message: "Channel not found" });

        const channelId = channel._id;
        const channelIdString = channelId.toString();

        // 2. Fetch Videos (Matching both String and ObjectId)
        const videos = await mongoose.connection.db
            .collection("videos")
            .find({
                $or: [
                    { owner: channelIdString }, 
                    { owner: channelId }       
                ]
            })
            .sort({ createdAt: -1 })
            .toArray();

        // 3. Get Real-time Subscriber Count
        const subscribersCount = await Subscription.countDocuments({
            channel: channelId
        });

        // 4. Check if the Current User is Subscribed
        let isSubscribed = false;
        if (loggedInUserId) {
            const subscription = await Subscription.findOne({
                subscriber: loggedInUserId,
                channel: channelId
            });
            isSubscribed = !!subscription; // Converts object to true, null to false
        }

        res.status(200).json({
            success: true,
            data: {
                ...channel,
                videos,
                subscribersCount, // Dynamic count from Subscription model
                isSubscribed,     // Boolean to toggle your frontend button
                totalVideos: videos.length
            }
        });
    } catch (error) {
        console.error("Channel Fetch Error:", error);
        res.status(500).json({ message: error.message });
    }
};