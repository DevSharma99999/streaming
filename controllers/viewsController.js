import { User } from "../models/userModel.js";
// In viewsController.js
import { video as VideoModel } from "../models/videoModel.js"; // Use your established import pattern

export const incrementViews = async (req, res) => {
    const { videoId } = req.params;
    await VideoModel.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    });
    res.status(200).json({ message: "View counted" });
};

export const checkWatchLater = async (req, res) => {
    try {
        const { videoId } = req.params;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isWatchLater = Array.isArray(user.watchLater) && user.watchLater.map(id => id.toString()).includes(videoId.toString());

        return res.status(200).json({ success: true, isWatchLater });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const toggleWatchLater = async (req, res) => {
    try {
        const { videoId } = req.params;
        // FIX: Use _id instead of id to match MongoDB/Mongoose defaults
        const user = await User.findById(req.user._id);

        if (!user) return res.status(404).json({ message: "User not found" });

        // Ensure we compare strings
        const videoIndex = user.watchLater.map(id => id.toString()).indexOf(videoId.toString());

        if (videoIndex > -1) {
            user.watchLater.splice(videoIndex, 1); // Removes it
        } else {
            user.watchLater.push(videoId); // Adds it
        }

        await user.save();
        res.status(200).json({
            success: true,
            message: videoIndex > -1 ? "Removed from Watch Later" : "Added to Watch Later",
            isWatchLater: videoIndex === -1
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};