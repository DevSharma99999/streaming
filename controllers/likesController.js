import mongoose from "mongoose";
import { video as VideoModel } from "../models/videoModel.js";
// import { Like } from "../models/l";

// export const getLikeStatus = async (req, res) => {
//     try {
//         const { videoId } = req.params;
//         const userId = req.user?._id;

//         // If not logged in, it's definitely not liked
//         if (!userId) {
//             return res.status(200).json({ isLiked: false });
//         }

//         const existingLike = await Like.findOne({
//             video: videoId,
//             likedBy: userId
//         });

//         res.status(200).json({ 
//             success: true, 
//             isLiked: !!existingLike // Returns true if object exists, false if null
//         });
//     } catch (error) {
//         res.status(500).json({ message: "Error fetching like status" });
//     }
// };
export const toggleLike = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user?._id || req.user?.id;
        console.log(userId,videoId,"hiiiiiii");
        // 1. Safety Check: Did the frontend send a valid User ID?
        if (!userId) {
            return res.status(401).json({ message: "User ID not found in token." });
        }

        // 2. Safety Check: Did the frontend send a valid Video ID?
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({ message: `Invalid Video ID format received: ${videoId}` });
        }

        // 3. Find the video
        const videoData = await VideoModel.findById(videoId); 
        if (!videoData) {
            return res.status(404).json({ message: "Video not found in the database." });
        }

        // 4. Safely check arrays (fallback to empty arrays if undefined)
        const likesArray = videoData.likes || [];
        const dislikesArray = videoData.dislikes || [];

        const isLiked = likesArray.some(id => id.toString() === userId.toString());

        // 5. Use MongoDB's safe update operators to prevent array crashes
        if (isLiked) {
            // Remove like
            await VideoModel.findByIdAndUpdate(videoId, { $pull: { likes: userId } });
        } else {
            // Add like, remove dislike
            await VideoModel.findByIdAndUpdate(videoId, {
                $addToSet: { likes: userId },
                $pull: { dislikes: userId }
            });
        }

        const updatedVideo = await VideoModel.findById(videoId);

        res.status(200).json({ 
            success: true, 
            likesCount: updatedVideo.likes?.length || 0, 
            dislikesCount: updatedVideo.dislikes?.length || 0 
        });
    } catch (error) {
        console.error("💥 Backend Like Error:", error);
        // This will send the exact crash reason to your frontend alert
        res.status(500).json({ message: `Backend Crash: ${error.message}` });
    }
};

export const toggleDislike = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user?._id || req.user?.id;

        if (!userId) return res.status(401).json({ message: "User ID not found in token." });
        if (!mongoose.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({ message: `Invalid Video ID format received: ${videoId}` });
        }

        const videoData = await VideoModel.findById(videoId);
        if (!videoData) return res.status(404).json({ message: "Video not found in the database." });

        const likesArray = videoData.likes || [];
        const dislikesArray = videoData.dislikes || [];

        const isDisliked = dislikesArray.some(id => id.toString() === userId.toString());

        if (isDisliked) {
            await VideoModel.findByIdAndUpdate(videoId, { $pull: { dislikes: userId } });
        } else {
            await VideoModel.findByIdAndUpdate(videoId, {
                $addToSet: { dislikes: userId },
                $pull: { likes: userId }
            });
        }

        const updatedVideo = await VideoModel.findById(videoId);

        res.status(200).json({ 
            success: true, 
            likesCount: updatedVideo.likes?.length || 0, 
            dislikesCount: updatedVideo.dislikes?.length || 0 
        });
    } catch (error) {
        console.error("💥 Backend Dislike Error:", error);
        res.status(500).json({ message: `Backend Crash: ${error.message}` });
    }
};