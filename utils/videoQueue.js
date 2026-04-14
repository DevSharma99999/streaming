import { Queue, Worker } from "bullmq";
import Redis from 'ioredis';
import { processAndUploadVideo } from "./videoProcessor.js";
import { video } from "../models/videoModel.js";
import fs from 'fs';
import path from "path";
import { processVideoSummaryJob } from "./summary.js";



const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Mandatory for BullMQ
  tls: {
    rejectUnauthorized: false // Required for some serverless environments like Render/Upstash
  }
});

export const videoQueue = new Queue("video-processing", { connection });

const worker = new Worker(
    "video-processing",
    async (job) => {

        const { localPath, title, description, userThumbnailUrl, category, owner } = job.data;

        console.log(`🎬 Processing: ${title}`);
        console.log("Worker path:", localPath);
console.log("Exists:", fs.existsSync(localPath));
console.log("Worker path:", localPath);
console.log("EXISTS IN WORKER:", fs.existsSync(localPath));
        
        let result;
        try {
            result = await processAndUploadVideo(localPath);

            const finalThumbnail = userThumbnailUrl || result.fallbackThumbUrl;
            console.log("🤖 Starting AI summary...");
            const aiResult = await processVideoSummaryJob(result.audioPath);

            const transcript = aiResult?.transcript || "";
            const summary = aiResult?.summary || "Summary not available";
           const shortTranscript = transcript ? transcript.slice(0, 2000) : "";
           console.log(shortTranscript);
            await video.create({
                title,
                description,
                category: category || "General",
                owner,
                videoUrl: result.url360,
                videoUrl480: result.url480,
                cloudinaryId: `hls_streams/${result.videoId}`,
                thumbnail: finalThumbnail,
                duration: result.duration,
                transcript:shortTranscript,
                summary,
                status: "ready" 
            });

            console.log(`✅ Success: ${title}`);

        } catch (error) {
            console.error("❌ Worker Error:", error.message);
            throw error;
        }finally {
    try {
        if (result?.audioPath) {
            const dir = path.dirname(result.audioPath);

            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                console.log("🧹 Cleaned temp files");
            }
        }

        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }
    } catch (e) {
        console.error("Cleanup error:", e.message || e);
    }
}
    },
    {
        connection,
        concurrency: 1,
        lockDuration: 600000
    }
);