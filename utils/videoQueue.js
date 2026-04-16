import { Queue, Worker } from "bullmq";
import Redis from 'ioredis';
import fs from 'fs';
import path from "path";
import { processAndUploadVideo } from "./videoProcessor.js";
import { video as VideoModel } from "../models/videoModel.js";
import { processVideoSummaryJob } from "./summary.js";

const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    tls: { rejectUnauthorized: false }
});

// Named export for the controller
export const videoQueue = new Queue("video-processing", { connection });

// Initialize Worker
const worker = new Worker(
    "video-processing",
    async (job) => {
        const { localPath, title, description, userThumbnailUrl, category, owner, tags } = job.data;
        let result = null;

        try {
            console.log("-----------------------------------------");
            console.log(`🚀 JOB START: ${job.id} | Title: ${job.data.title}`);
            
            // Check if paths are actually strings
            console.log(`📍 Path Check: ${job.data.localPath}`);
            
            const result = await processAndUploadVideo(job.data.localPath);
            
            console.log("💾 Database saving...");
            const finalThumbnail = userThumbnailUrl || result.fallbackThumbUrl;
            
            console.log("🤖 Starting AI summary...");
            const aiResult = await processVideoSummaryJob(result.audioPath);

            // Save to DB
            await VideoModel.create({
                title,
                description,
                category: category || "General",
                tags: tags || [],
                owner,
                videoUrl: result.url360,
                videoUrl480: result.url480,
                cloudinaryId: result.videoId,
                thumbnail: finalThumbnail,
                duration: result.duration,
                transcript: aiResult?.transcript?.slice(0, 2000) || "",
                summary: aiResult?.summary || "Summary not available",
                status: "ready" 
            });

            console.log(`✅ Success: ${title}`);
        } catch (error) {
            console.error("🛑 WORKER FATAL ERROR:");
            console.error(`Name: ${error.name}`);
            console.error(`Message: ${error.message}`);
            console.error(`Stack: ${error.stack}`);
            throw error;
        } finally {
            // STRICT CLEANUP FOR RENDER 512MB LIMIT
            try {
                if (result?.outputDir && fs.existsSync(result.outputDir)) {
                    fs.rmSync(result.outputDir, { recursive: true, force: true });
                }
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
                console.log("🧹 Cleanup complete");
            } catch (e) {
                console.error("Cleanup error:", e.message);
            }
        }
    },
    {
        connection,
        concurrency: 1, // Only 1 video at a time to prevent OOM
        lockDuration: 600000
    }
);

// Fail-safe default export
export default videoQueue;

// Add these listeners to catch Redis/Queue connection issues
worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed with error: ${err.message}`);
});

worker.on('error', err => {
    console.error(`🔥 Worker Global Error: ${err.message}`);
});