// @ts-nocheck
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { videoQueue } from "../utils/videoQueue.js";
import { User } from "../models/userModel.js";
import { video as VideoModel } from "../models/videoModel.js";
import { Subscription } from "../models/subscriptionModel.js";
import { v2 as cloudinary } from "cloudinary";

/**
 * UPLOAD VIDEO
 * Handles dual file upload (video + optional custom thumbnail)
 */
export const uploadVideo = async (req, res) => {
    try {
        const { title, description, category , tags } = req.body;

        // Extract paths from multer (using upload.fields)
        const videoLocalPath = req.files?.videoFile?.[0]?.path;
        const thumbLocalPath = req.files?.thumbnail?.[0]?.path;

        if (!videoLocalPath) {
            return res.status(400).json({ message: "Video file is required" });
        }

        let userThumbnailUrl = "";
        console.log("REQ FILES:", req.files);
        // If user provided a custom thumbnail, upload it to Cloudinary immediately
        if (thumbLocalPath) {
            const thumbUpload = await cloudinary.uploader.upload(thumbLocalPath, {
                folder: "thumbnails"
            });
            userThumbnailUrl = thumbUpload.secure_url;
            if (fs.existsSync(thumbLocalPath)) fs.unlinkSync(thumbLocalPath);
        }
        
        // Add to BullMQ for heavy HLS processing (360p, 480p)
        // const job = await videoQueue.add("video-processing", {
        //     localPath: videoLocalPath,

// const videoLocalPath = req.files?.videoFile?.[0]?.path;

const absolutePath = path.resolve(videoLocalPath);

console.log("ABS PATH:", absolutePath);
         const job = await videoQueue.add("video-processing", {
            localPath: absolutePath,
            title,
            description,
            tags: tags ? tags.split(",").map(tag => tag.trim()) : [],
            category: category || "General",
            userThumbnailUrl,
            owner: req.user._id
        });

        return res.status(202).json({
            success: true,
            jobId: job.id,
            message: "Video upload received! Processing started."
        });
    } catch (error) {
        console.error("Upload Controller Error:", error);
        return res.status(500).json({ message: "Server error during upload" });
    }
};

/**
 * UPDATE VIDEO DETAILS
 * Step-by-step ownership verification to handle manual Atlas edits
 */
export const updateVideoDetails = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { title, description, category ,tags } = req.body;
        const userId = req.user._id.toString();

        const video = await VideoModel.findById(videoId);
        if (!video) return res.status(404).json({ message: "Video not found" });

        // Ownership Check: handles both String and ObjectId comparisons
        if (video.owner.toString().trim() !== userId.trim()) {
            return res.status(403).json({ message: "Unauthorized: You do not own this video" });
        }
        // A flexible split that handles hashtags, commas, and spaces
const processTags = (tagInput) => {
    if (!tagInput) return [];

    // This regex finds all alphanumeric words, 
    // effectively ignoring #, commas, and extra spaces.
    const tags = tagInput.match(/\w+/g); 

    return tags 
        ? tags.map(tag => tag.toLowerCase()) 
        : [];
};
// Inside your updateVideoDetails or uploadVideo

        video.title = title || video.title;
        video.description = description || video.description;
        video.category = category || video.category;
video.tags = processTags(tags);
        

        const updatedVideo = await video.save();
        res.status(200).json({ success: true, data: updatedVideo });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * DELETE VIDEO
 * Cleans Cloudinary resources and DB entry
 */
export const deleteVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user._id.toString();

        const video = await VideoModel.findById(videoId);
        if (!video) return res.status(404).json({ message: "Video not found" });

        if (video.owner.toString().trim() !== userId.trim()) {
            return res.status(403).json({ message: "Unauthorized delete request" });
        }

        // Delete from Cloudinary
        if (video.cloudinaryId) {
            await cloudinary.api.delete_resources_by_prefix(`hls_streams/${video.cloudinaryId}`);
        }

        await VideoModel.findByIdAndDelete(videoId);
        res.status(200).json({ success: true, message: "Video deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET VIDEO BY ID
 * Increments history and watch-later state.
 * FIXED: No duplicate videos in history. New views move to top.
 */
export const getVideoById = async (req, res) => {
    try {
        const { videoId } = req.params;
        let userId = req.user?._id;

        // Token extraction logic if req.user is missing
        if (!userId) {
            try {
                const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");
                if (token) {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    userId = decoded.id;
                }
            } catch (_) { userId = null; }
        }

        const foundVideo = await VideoModel.findById(videoId).populate("owner", "username avatar").lean();
        if (!foundVideo) return res.status(404).json({ message: "Video not found" });

        let watchedTime = 0;

        if (userId) {
            // Find saved progress for this specific user
            const user = await User.findById(userId).lean();
            const historyEntry = user.history?.find(h => h.video.toString() === videoId);
            if (historyEntry) {
                watchedTime = historyEntry.watchedTime || 0;
            }

            // Cleanup duplicates and move to top of history
            await User.findByIdAndUpdate(userId, { $pull: { history: { video: videoId } } });
            await User.findByIdAndUpdate(userId, {
                $push: {
                    history: {
                        $each: [{ video: videoId, watchedAt: new Date(), watchedTime: watchedTime }],
                        $position: 0,
                        $slice: 50
                    }
                }
            });
        }

        res.status(200).json({
            success: true,
            data: { ...foundVideo, watchedTime }, // watchedTime included here
            subCount: await Subscription.countDocuments({ channel: foundVideo.owner._id })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * ENGAGEMENT CONTROLLERS
 */
export const incrementViews = async (req, res) => {
    try {
        const { videoId } = req.params;
        await VideoModel.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
        res.status(200).json({ message: "View counted" });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

export const toggleWatchLater = async (req, res) => {
    try {
        const { videoId } = req.params;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const videoIndex = user.watchLater.map(id => id.toString()).indexOf(videoId.toString());
        if (videoIndex > -1) {
            user.watchLater.splice(videoIndex, 1);
        } else {
            user.watchLater.push(videoId);
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

// controllers/videoController.js
export const getRelatedVideos = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { category, tags } = req.query;

        const tagArray = tags ? tags.split(',') : [];

        const related = await VideoModel.find({
            _id: { $ne: videoId }, // Exclude current video
            $or: [
                { category: category }, 
                { tags: { $in: tagArray } } // Match any of the tags
            ]
        })
        .populate("owner", "username avatar")
        .limit(10)
        .sort({ views: -1 }); // Rank by popularity (views)

        res.status(200).json({ success: true, data: related });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSearchVideos = async (req, res) => {
    try {
        const { q, isTag } = req.query;
        // Add this to getSearchVideos logic
if (req.query.category) {
    const catVideos = await VideoModel.find({ category: req.query.category })
        .populate("owner", "username avatar");
    return res.status(200).json(catVideos);
}

if (isTag === 'true') {
    const taggedVideos = await VideoModel.find({ 
        tags: { $in: [q.toLowerCase()] } 
    }).populate("owner", "username avatar");
    return res.status(200).json(taggedVideos);
}
        if (!q) return res.status(200).json([]);

        // 1. Try Text Search first for ranked relevance
        let videos = await VideoModel.find(
            { $text: { $search: q } },
            { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" } })
        .populate("owner", "username avatar")
        .limit(20);

        // 2. If no results, fallback to Regex (Fuzzy Search)
        if (videos.length === 0) {
            videos = await VideoModel.find({
                $or: [
                    { title: { $regex: q, $options: "i" } },
                    { tags: { $regex: q, $options: "i" } },
                    { category: { $regex: q, $options: "i" } }
                ]
            })
            .populate("owner", "username avatar")
            .limit(20);
        }

        res.status(200).json(videos);
    } catch (error) {
        res.status(500).json({ message: "Search failed", error: error.message });
    }
};
