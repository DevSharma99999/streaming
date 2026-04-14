import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    content: { type: String, required: true },

    video: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Video", 
        required: true 
    },

    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },

    // ✅ Reply system (parent comment)
    parent: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "comment", 
        default: null 
    },

    // ✅ Likes / Dislikes
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    createdAt: { type: Date, default: Date.now }
});

export const comment = mongoose.model("comment", commentSchema);