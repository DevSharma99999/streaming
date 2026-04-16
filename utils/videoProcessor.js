import fs from 'fs';
import path from 'path';
import ffmpeg from "fluent-ffmpeg";
import { v2 as cloudinary } from "cloudinary";

if (process.env.NODE_ENV === "production") {
    ffmpeg.setFfmpegPath("ffmpeg");
    ffmpeg.setFfprobePath("ffprobe");
} else {
    // Windows dev paths
    const BASE_PATH = "C:\\ffmpeg\\bin"; 
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
    const videoId = `video_${Date.now()}`;
    const outputDir = path.resolve(`./public/temp/${videoId}`);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const runffmpeg = (opts, name) => 
        new Promise((res, rej) => {
            ffmpeg(absPath).outputOptions(opts).output(path.join(outputDir, name))
            .on("end", res).on("error", rej).run();
        });

    try {
        const metadata = await new Promise((res, rej) => ffmpeg.ffprobe(absPath, (e, d) => e ? rej(e) : res(d)));
        const duration = metadata.format.duration;

        // Sequential to save RAM
        await runffmpeg(["-vf scale=-2:360", "-hls_time 10", "-f hls"], "360p.m3u8");
        await runffmpeg(["-vf scale=-2:480", "-hls_time 10", "-f hls"], "480p.m3u8");
        
        const audioPath = path.join(outputDir, "audio.mp3");
        await new Promise((res, rej) => ffmpeg(absPath).noVideo().save(audioPath).on("end", res).on("error", rej));
        
        await new Promise((res, rej) => ffmpeg(absPath).screenshots({ timestamps: ['5%'], filename: 'thumb.jpg', folder: outputDir, size: '640x360' }).on("end", res).on("error", rej));

        const files = fs.readdirSync(outputDir);
        let results = { url360: "", url480: "", fallbackThumbUrl: "" };

        for (const file of files) {
            if (file === "audio.mp3") continue;
            const fPath = path.join(outputDir, file);
            const up = await cloudinary.uploader.upload(fPath, {
                resource_type: (file.endsWith(".m3u8") || file.endsWith(".ts")) ? "raw" : "image",
                folder: `hls_streams/${videoId}`,
                public_id: file
            });
            if (file.includes("360p.m3u8")) results.url360 = up.secure_url;
            if (file.includes("480p.m3u8")) results.url480 = up.secure_url;
            if (file.endsWith(".jpg")) results.fallbackThumbUrl = up.secure_url;
            
            fs.unlinkSync(fPath); // Delete immediately to free disk
        }

        return { ...results, duration, videoId, audioPath, outputDir };
    } catch (error) {
        if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
        throw error;
    }
};