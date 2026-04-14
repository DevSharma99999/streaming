import { video as Video } from "../models/videoModel.js";
import { User } from "../models/userModel.js"; // Import User model

export const getAllVideos = async (req, res) => {
    try {
        const { query, category, page = 1, limit = 12 } = req.query; // Default to 12
        let filter = {};

        if (category && category !== "All") filter.category = category;

        if (query) {
            // ... (Your User search logic remains exactly as is)
            filter.$or = [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } },
                { tags: { $regex: query, $options: "i" } }
            ];
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const videos = await Video.find(filter)
            .populate("owner", "username avatar fullName") 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const totalVideos = await Video.countDocuments(filter);

        res.status(200).json({
            success: true,
            totalVideos,
            currentPage: pageNum,
            // Key: tell frontend if more exist
            hasMore: totalVideos > (skip + videos.length), 
            data: videos
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};