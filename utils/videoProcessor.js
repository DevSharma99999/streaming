import fs from 'fs';
import path from 'path';
import ffmpeg from "fluent-ffmpeg";
import { v2 as cloudinary } from "cloudinary";
import dotenv from 'dotenv';

dotenv.config();

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
    const absolutePath = path.resolve(localPath);
    if (!fs.existsSync(absolutePath)) throw new Error("File not found: " + absolutePath);

    const videoId = `video_${Date.now()}`;
    const outputDir = path.resolve(`./public/temp/${videoId}`);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const runffmpeg = (options, outputName) =>
        new Promise((resolve, reject) => {
            ffmpeg(absolutePath)
                .outputOptions(options)
                .output(path.join(outputDir, outputName))
                .on("end", resolve)
                .on("error", reject)
                .run();
        });

    try {
        console.log("📡 Starting ffprobe...");
        const metadata = await new Promise((res, rej) =>
            ffmpeg.ffprobe(absolutePath, (err, data) => err ? rej(err) : res(data))
        );
        const duration = metadata.format.duration;

        // SEQUENTIAL ENCODING TO SAVE RAM (Do not use Promise.all)
        console.log("⏳ Encoding 360p...");
        await runffmpeg(["-vf scale=-2:360", "-hls_time 10", "-hls_list_size 0", "-f hls"], "360p.m3u8");

        console.log("⏳ Encoding 480p...");
        await runffmpeg(["-vf scale=-2:480", "-hls_time 10", "-hls_list_size 0", "-f hls"], "480p.m3u8");

        console.log("🎧 Extracting audio...");
        const audioPath = path.join(outputDir, "audio.mp3");
        await new Promise((res, rej) => {
            ffmpeg(absolutePath).noVideo().audioCodec("libmp3lame").save(audioPath).on("end", res).on("error", rej);
        });

        console.log("🖼️ Generating thumbnail...");
        await new Promise((res, rej) => {
            ffmpeg(absolutePath).screenshots({ timestamps: ['5%'], filename: 'fallback_thumb.jpg', folder: outputDir, size: '640x360' }).on("end", res).on("error", rej);
        });

        const files = fs.readdirSync(outputDir);
        let urls = { url360: "", url480: "", fallbackThumbUrl: "" };

        console.log(`🚀 Uploading ${files.length} files...`);
        for (const file of files) {
            if (file === "audio.mp3") continue; // Keep audio for AI processing
            const filePath = path.join(outputDir, file);
            
            const result = await cloudinary.uploader.upload(filePath, {
                resource_type: (file.endsWith(".m3u8") || file.endsWith(".ts")) ? "raw" : "image",
                folder: `hls_streams/${videoId}`,
                public_id: file,
            });

            if (file.includes("360p.m3u8")) urls.url360 = result.secure_url;
            if (file.includes("480p.m3u8")) urls.url480 = result.secure_url;
            if (file.endsWith(".jpg")) urls.fallbackThumbUrl = result.secure_url;

            // DELETE FILE IMMEDIATELY AFTER UPLOAD TO FREE DISK SPACE
            fs.unlinkSync(filePath);
        }

        return { ...urls, duration, videoId, audioPath, outputDir };

    } catch (error) {
        // Cleanup if error occurs inside processor
        if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true, force: true });
        throw error;
    }
};