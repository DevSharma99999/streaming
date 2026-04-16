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

export const videoQueue = new Queue("video-processing", { connection });

const worker = new Worker(
    "video-processing",
    async (job) => {
        const { localPath, title, description, userThumbnailUrl, category, owner, tags } = job.data;
        let result = null; // Declare outside for cleanup visibility

        try {
            console.log("-----------------------------------------");
            console.log(`🚀 PROCESSING JOB: ${job.id} | Title: ${title}`);
            console.log(`📂 Path Exists: ${fs.existsSync(localPath)}`);

            result = await processAndUploadVideo(localPath);

            const finalThumbnail = userThumbnailUrl || result.fallbackThumbUrl;
            
            console.log("🤖 Starting AI Analysis...");
            const aiResult = await processVideoSummaryJob(result.audioPath);

            const shortTranscript = aiResult?.transcript?.slice(0, 2000) || "";

            await VideoModel.create({
                title,
                description,
                category: category || "General",
                tags: tags || [],
                owner,
                videoUrl: result.url360,
                videoUrl480: result.url480,
                cloudinaryId: `hls_streams/${result.videoId}`,
                thumbnail: finalThumbnail,
                duration: result.duration,
                transcript: shortTranscript,
                summary: aiResult?.summary || "Summary not available",
                status: "ready" 
            });

            console.log(`✅ SUCCESS: ${title}`);
        } catch (error) {
            console.error("🛑 WORKER FATAL ERROR:");
            console.error(`Message: ${error.message}`);
            throw error;
        } finally {
            console.log("🧹 Commencing final cleanup...");
            try {
                if (result?.outputDir && fs.existsSync(result.outputDir)) {
                    fs.rmSync(result.outputDir, { recursive: true, force: true });
                    console.log("🗑️ Temp folder cleared");
                }
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                    console.log("🗑️ Original MP4 cleared");
                }
            } catch (cleanupError) {
                console.error("Cleanup warning:", cleanupError.message);
            }
        }
    },
    {
        connection,
        concurrency: 1, // Stay under 512MB RAM
        lockDuration: 600000
    }
);

worker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed: ${err.message}`));
worker.on('error', err => console.error(`🔥 Global Worker Error: ${err.message}`));

export default videoQueue;