import fs from 'fs';
import path from 'path';
import ffmpeg from "fluent-ffmpeg";
import { v2 as cloudinary } from "cloudinary";
import dotenv from 'dotenv';

dotenv.config();

// Standardize paths for Production (Render) vs Local (Windows)
if (process.env.NODE_ENV === "production") {
    ffmpeg.setFfmpegPath("ffmpeg");
    ffmpeg.setFfprobePath("ffprobe");
} else {
    const BASE_PATH = "C:\\Users\\DEEPAK\\Downloads\\ffmpeg-2026-04-06-git-7fd2be97b9-full_build\\ffmpeg-2026-04-06-git-7fd2be97b9-full_build\\bin"; 
    ffmpeg.setFfmpegPath(path.join(BASE_PATH, "ffmpeg.exe"));
    ffmpeg.setFfprobePath(path.join(BASE_PATH, "ffprobe.exe"));
}

cloudinary.config({ 
    cloud_name: process.env.cloudinaryName, 
    api_key: process.env.cloudinarykey, 
    api_secret: process.env.cloudinarySecret 
});

export const processAndUploadVideo = async (localPath) => {
    const absPath = path.resolve(localPath);
    if (!fs.existsSync(absPath)) throw new Error("Video file not found at: " + absPath);

    const videoId = `video_${Date.now()}`;
    const outputDir = path.resolve(`./public/temp/${videoId}`);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const runffmpeg = (options, outputName) =>
        new Promise((resolve, reject) => {
            console.log(`🛠️ Initializing FFmpeg for: ${outputName}`);
            ffmpeg(absPath)
                .outputOptions(options)
                .output(path.join(outputDir, outputName))
                .on("start", (cmd) => console.log(`💻 Executing: ${outputName}`))
                .on("progress", (p) => {
                   if(p.percent) console.log(`⏳ ${outputName} Progress: ${Math.round(p.percent)}%`);
                })
                .on("end", resolve)
                .on("error", (err) => {
                    console.error(`❌ FFmpeg Error [${outputName}]: ${err.message}`);
                    reject(err);
                })
                .run();
        });

    try {
        console.log("📡 Probing video metadata...");
        const metadata = await new Promise((res, rej) => 
            ffmpeg.ffprobe(absPath, (e, d) => e ? rej(e) : res(d))
        );
        const duration = metadata.format.duration;
        console.log(`⏱️ Duration: ${duration}s`);

        // Render-safe options
        const lowRamOpts = ["-preset ultrafast", "-threads 1", "-hls_time 6", "-hls_list_size 0"];

        console.log("🎬 Encoding 360p...");
        await runffmpeg(["-vf scale=-2:360", ...lowRamOpts, "-f hls"], "360p.m3u8");
        
        console.log("🎬 Encoding 480p...");
        await runffmpeg(["-vf scale=-2:480", ...lowRamOpts, "-f hls"], "480p.m3u8");
        
        console.log("🎧 Extracting audio for AI...");
        const audioPath = path.join(outputDir, "audio.mp3");
        await new Promise((res, rej) => {
            ffmpeg(absPath).noVideo().audioCodec("libmp3lame").save(audioPath).on("end", res).on("error", rej);
        });

        console.log("🖼️ Capturing thumbnail...");
        await new Promise((res, rej) => {
            ffmpeg(absPath).screenshots({ 
                timestamps: ['5%'], 
                filename: 'fallback_thumb.jpg', 
                folder: outputDir, 
                size: '640x360' 
            }).on("end", res).on("error", rej);
        });

        const files = fs.readdirSync(outputDir);
        let urls = { url360: "", url480: "", fallbackThumbUrl: "" };

        console.log(`🚀 Uploading ${files.length} files to Cloudinary...`);
        for (const file of files) {
            if (file === "audio.mp3") continue;
            const fPath = path.join(outputDir, file);
            
            const up = await cloudinary.uploader.upload(fPath, {
                resource_type: (file.endsWith(".m3u8") || file.endsWith(".ts")) ? "raw" : "image",
                folder: `hls_streams/${videoId}`,
                public_id: file,
            });

            if (file.includes("360p.m3u8")) urls.url360 = up.secure_url;
            if (file.includes("480p.m3u8")) urls.url480 = up.secure_url;
            if (file.endsWith(".jpg")) urls.fallbackThumbUrl = up.secure_url;

            fs.unlinkSync(fPath); // Delete immediately to free disk space
        }

        return { ...urls, duration, videoId, audioPath, outputDir };

    } catch (error) {
        if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
        throw error;
    }
};