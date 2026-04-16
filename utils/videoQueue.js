const worker = new Worker(
    "video-processing",
    async (job) => {
        const { localPath, title, description, userThumbnailUrl, category, owner } = job.data;
        let result = null;

        try {
            console.log(`🎬 Processing: ${title}`);
            
            // 1. Process and Upload
            result = await processAndUploadVideo(localPath);

            const finalThumbnail = userThumbnailUrl || result.fallbackThumbUrl;
            
            console.log("🤖 Starting AI summary...");
            const aiResult = await processVideoSummaryJob(result.audioPath);

            const transcript = aiResult?.transcript || "";
            const summary = aiResult?.summary || "Summary not available";
            const shortTranscript = transcript ? transcript.slice(0, 2000) : "";

            // 2. Save to Database
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
                transcript: shortTranscript,
                summary,
                status: "ready" 
            });

            console.log(`✅ Success: ${title}`);

        } catch (error) {
            console.error("❌ Worker Error:", error.message);
            throw error; // Let BullMQ handle retries
        } finally {
            // ALWAYS CLEANUP
            console.log("🧹 Commencing final cleanup...");
            try {
                // Delete the entire temp folder for this video (including audio)
                if (result?.outputDir && fs.existsSync(result.outputDir)) {
                    fs.rmSync(result.outputDir, { recursive: true, force: true });
                    console.log("🗑️ Temp directory cleared");
                }
                // Delete the original uploaded mp4 file
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                    console.log("🗑️ Original MP4 cleared");
                }
            } catch (cleanupError) {
                console.error("Cleanup Warning:", cleanupError.message);
            }
        }
    },
    {
        connection,
        concurrency: 1, // Crucial for 512MB RAM: Only one video at a time
        lockDuration: 600000
    }
);