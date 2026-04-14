import { Router } from "express";
import { uploadVideo } from "../controllers/videoController.js";
import { upload } from "../middleware/multerFileUploader.js";
import { getAllVideos } from "../controllers/fetchVideos.js";
import { updateVideoDetails } from "../controllers/videoController.js";
import { deleteVideo } from "../controllers/videoController.js";
import { getVideoById } from "../controllers/videoController.js";
import { getSearchVideos } from "../controllers/videoController.js";
// import { getLikeStatus } from "../controllers/likesController.js";
import { getRelatedVideos } from "../controllers/videoController.js";
// Import New Controllers
import { toggleLike, toggleDislike } from "../controllers/likesController.js";
import { incrementViews, toggleWatchLater, checkWatchLater } from "../controllers/viewsController.js";

// Import Auth Middleware
import { verifyJWT } from "../middleware/authMiddleware.js";

const videoRouter = Router();

// --- PUBLIC ROUTES ---
// Anyone can see the videos
videoRouter.get("/", getAllVideos);

// --- PROTECTED ROUTES (Requires Login) ---
// 1. Upload Video
videoRouter.post("/upload",(req,res,next)=>{
console.log("in the routesss");
next();
},
    verifyJWT,
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    uploadVideo
);

// 2. Like/Dislike Logic
videoRouter.post("/v/:videoId/like", verifyJWT, toggleLike);
videoRouter.post("/v/:videoId/dislike", verifyJWT, toggleDislike);

// 3. Library & Engagement
// Views should be incremented for anonymous and logged in users alike.
videoRouter.post("/v/:videoId/view", incrementViews);
videoRouter.post("/v/:videoId/watch-later", verifyJWT, toggleWatchLater);
videoRouter.get("/v/:videoId/watch-later", verifyJWT, checkWatchLater);

// Ensure video fetch knows authenticated user for watch-later state
videoRouter.get("/v/:videoId", getVideoById); // public metadata route
// routes/videoRoute.js
videoRouter.patch("/update/:videoId", verifyJWT, updateVideoDetails);
videoRouter.delete("/delete/:videoId", verifyJWT, deleteVideo);
// videoRouter.get("/v/:videoId", verifyJWT, getLikeStatus);


//serach
videoRouter.get("/search", getSearchVideos);
videoRouter.get("/related/:videoId", getRelatedVideos);
export default videoRouter;