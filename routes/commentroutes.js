import express from "express";
import {
    addComment,
    getVideoComments,
    deleteComment,
    toggleCommentLike,
    toggleCommentDislike
} from "../controllers/commentController.js";

import { verifyJWT } from "../middleware/authMiddleware.js";

const commentRouter = express.Router();

// ✅ Get comments
commentRouter.get("/:videoId", getVideoComments);

// ✅ Add comment / reply
commentRouter.post("/:videoId", verifyJWT, addComment);

// ✅ Delete
commentRouter.delete("/c/:commentId", verifyJWT, deleteComment);

// ✅ Like
commentRouter.post("/like/:commentId", verifyJWT, toggleCommentLike);

// ✅ Dislike
commentRouter.post("/dislike/:commentId", verifyJWT, toggleCommentDislike);

export default commentRouter;