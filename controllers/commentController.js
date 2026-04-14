// 1. Change the import name to Capital 'Comment'
import { comment as Comment } from "../models/commentsSchema.js";

export const addComment = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { content, parent } = req.body;   // ⭐ ADD THIS

        if (!content) {
            return res.status(400).json({ message: "Content is required" });
        }

        const newComment = await Comment.create({
            content,
            video: videoId,
            user: req.user._id,
            parent: parent || null   // ⭐ SAVE IT
        });

        res.status(201).json({ success: true, data: newComment });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all comments for a video (with pagination)
export const getVideoComments = async (req, res) => {
    try {
        const { videoId } = req.params;

        // 1. Get all comments
        const allComments = await Comment.find({ video: videoId })
            .populate("user", "username avatar")
            .sort("-createdAt");

        // 2. Separate parent & replies
        const parentComments = [];
        const replyMap = {};

        allComments.forEach(c => {
            if (!c.parent) {
                parentComments.push({ ...c._doc, replies: [] });
            } else {
                if (!replyMap[c.parent]) replyMap[c.parent] = [];
                replyMap[c.parent].push(c);
            }
        });

        // 3. Attach replies to parent
        const structured = parentComments.map(c => ({
            ...c,
            replies: replyMap[c._id] || []
        }));

        res.status(200).json({ success: true, data: structured });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;

        // Find the comment and ensure the owner matches the logged-in user
        const commentToDelete = await Comment.findOneAndDelete({
            _id: commentId,
            user: userId // This is the security check!
        });

        if (!commentToDelete) {
            return res.status(404).json({
                success: false,
                message: "Comment not found or you are not authorized to delete it"
            });
        }

        res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// OLD ❌
// toggleLike
// toggleDislike

// NEW ✅
export const toggleCommentLike = async (req, res) => {
    try {
        const c = await Comment.findById(req.params.commentId);
        const userId = req.user._id;

        if (c.likes.includes(userId)) {
            c.likes.pull(userId);
        } else {
            c.likes.push(userId);
            c.dislikes.pull(userId);
        }

        await c.save();
        res.json(c);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const toggleCommentDislike = async (req, res) => {
    try {
        const c = await Comment.findById(req.params.commentId);
        const userId = req.user._id;

        if (c.dislikes.includes(userId)) {
            c.dislikes.pull(userId);
        } else {
            c.dislikes.push(userId);
            c.likes.pull(userId);
        }

        await c.save();
        res.json(c);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};