import express from "express";
import { getVideoSummary } from "../controllers/videoSummaryController.js";

const aiRouter = express.Router();

aiRouter.get("/summary/:videoId", getVideoSummary);

export default aiRouter;