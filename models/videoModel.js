import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    tags: {
        type: [String], // Array of strings
        default: []
    },
    videoUrl: { type: String, required: true }, // HLS .m3u8 link
    videoUrl480: { type: String },
    cloudinaryId: { type: String, required: true },
    thumbnail: { type: String, default: "" }, // URL of the generated image
    duration: { type: Number, default: 0 }, // In seconds
    category: { type: String, default: "General" },
    tags: [{ type: String }],
    // Interactions
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs
    
    // Timeline/Chapters
    timeline: [{
        time: Number, // seconds
        label: String // "Intro", "Coding Starts", etc.
    }],
    
    transcript: { type: String , maxlength: 2000},   // full AI transcript
    summary: { type: String },         // AI generated summary

    status: {
        type: String,
        enum: ["processing", "ready", "failed"],
        default: "processing"
    },

    createdAt: { type: Date, default: Date.now }
});
// Inside your videoModel.js
videoSchema.index({ 
    title: "text", 
    description: "text",
    tags: "text" 
}, {
    weights: {
        title: 10,  
        tags: 5,    // A match in the title is 10x more important
        description: 2, // A match in the description is less important
    },
    name: "VideoSearchIndex"
});

export const video = mongoose.model("Video", videoSchema);