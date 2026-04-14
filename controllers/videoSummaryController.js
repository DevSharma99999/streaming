import { video } from "../models/videoModel.js";

export const getVideoSummary = async (req, res) => {
  try {
    const { videoId } = req.params;

    const foundVideo = await video.findById(videoId).select("summary status");

    if (!foundVideo) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // 🧠 Handle processing state
    if (foundVideo.status === "processing") {
      return res.status(200).json({
        success: true,
        status: "processing",
        message: "Summary is still being generated"
      });
    }

    if (foundVideo.status === "failed") {
      return res.status(200).json({
        success: false,
        status: "failed",
        message: "Summary generation failed"
      });
    }

    return res.status(200).json({
      success: true,
      summary: foundVideo.summary
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};