import fs from 'fs';
import path from 'path';
import ffmpeg from "fluent-ffmpeg";
import { v2 as cloudinary } from "cloudinary";
import dotenv from 'dotenv';

dotenv.config();

/**
 * SMART FFmpeg PATH CONFIGURATION
 * This handles both your local Windows setup and Render's Linux setup automatically.
 */
if (process.env.NODE_ENV === "production") {
    // On Render/Linux, we use the global binary names
    ffmpeg.setFfmpegPath("ffmpeg");
    ffmpeg.setFfprobePath("ffprobe");
} else {
    // Keep your local Windows paths for development
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

    if (!fs.existsSync(localPath)) {
        throw new Error("Video file not found: " + localPath);
    }

    const videoId = `video_${Date.now()}`;
    const outputDir = path.resolve(`./public/temp/${videoId}`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const runffmpeg = (options, outputName) =>
        new Promise((resolve, reject) => {
            ffmpeg(localPath)
                .outputOptions(options)
                .output(path.join(outputDir, outputName))
                .on("end", resolve)
                .on("error", reject)
                .run();
        });

    try {

        // 🎯 Duration
        const metadata = await new Promise((res, rej) =>
            ffmpeg.ffprobe(localPath, (err, data) =>
                err ? rej(err) : res(data)
            )
        );

        const duration = metadata.format.duration;

        console.log("⏳ Encoding...");

        await Promise.all([
            runffmpeg([
                "-vf scale=-2:360",
                "-hls_time 15",   // ✅ IMPORTANT (small chunks)
                "-hls_list_size 0",
                "-hls_flags independent_segments",
                "-hls_segment_filename", path.join(outputDir, "360p_%03d.ts"),
                "-f hls"
            ], "360p.m3u8"),

            runffmpeg([
                "-vf scale=-2:480",
                "-hls_time 15",   // ✅ IMPORTANT
                "-hls_list_size 0",
                "-hls_flags independent_segments",
                "-hls_segment_filename", path.join(outputDir, "480p_%03d.ts"),
                "-f hls"
            ], "480p.m3u8")
        ]);

        // 🎧 Extract audio
        const audioPath = path.join(outputDir, "audio.mp3");

        await new Promise((res, rej) => {
            ffmpeg(localPath)
                .noVideo()
                .audioCodec("libmp3lame")
                .save(audioPath)
                .on("end", res)
                .on("error", rej);
        });

        // 🖼️ Thumbnail
        await new Promise((res, rej) => {
            ffmpeg(localPath)
                .screenshots({
                    timestamps: ['5%'],
                    filename: 'fallback_thumb.jpg',
                    folder: outputDir,
                    size: '640x360'
                })
                .on("end", res)
                .on("error", rej);
        });

        const files = fs.readdirSync(outputDir);

        let url360 = "";
        let url480 = "";
        let fallbackThumbUrl = "";

        console.log(`🚀 Uploading ${files.length} files...`);

        files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        for (const file of files) {

            if (file === "audio.mp3") continue;

            const filePath = path.join(outputDir, file);
            if (!fs.existsSync(filePath)) continue;

            let success = false;

            for (let i = 0; i < 6; i++) {
                try {
                    const result = await cloudinary.uploader.upload(filePath, {
                        resource_type: file.endsWith(".jpg") ? "image" : "raw",
                        folder: `hls_streams/${videoId}`,
                        public_id: file,
                        timeout: 600000
                    });

                    console.log(`✅ Uploaded: ${file}`);

                    // ✅ FIX: SET URLS PROPERLY
                    if (file.includes("360p.m3u8")) url360 = result.secure_url;
                    if (file.includes("480p.m3u8")) url480 = result.secure_url;
                    if (file.endsWith(".jpg")) fallbackThumbUrl = result.secure_url;

                    success = true;
                    break;

                } catch (err) {
                    console.log(`⚠ Retry ${i + 1} for ${file}`);
                    await new Promise(res => setTimeout(res, 5000));
                }
            }

            if (!success) {
                throw new Error(`Upload failed: ${file}`);
            }
        }

        console.log("DEBUG url360:", url360);

        if (!url360) throw new Error("360p upload failed");

        return {
            url360,
            url480,
            fallbackThumbUrl,
            duration,
            videoId,
            audioPath
        };

    } catch (error) {
        console.error("❌ Processing error:", error.message);
        throw error;
    }
};