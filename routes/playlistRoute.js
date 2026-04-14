import express from "express";
import {Playlist} from "../models/playlistModel.js";
import { verifyJWT } from "../middleware/authMiddleware.js";
const playlistRouter = express.Router();

// CREATE PLAYLIST
// GET USER PLAYLISTS
playlistRouter.get("/", verifyJWT, async (req, res) => {
  try {
    // We add .populate("videos") so the array contains objects, not just IDs
    const playlists = await Playlist.find({ owner: req.user._id }).populate("videos");
    res.json({ success: true, data: playlists });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET USER PLAYLISTS
playlistRouter.get("/", verifyJWT,async (req, res) => {
  const playlists = await Playlist.find({ owner: req.user._id });
  res.json({ data: playlists });
});

// ADD VIDEO
playlistRouter.post("/:id/add",verifyJWT, async (req, res) => {
  const { videoId } = req.body;

  const playlist = await Playlist.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { videos: videoId } },
    { new: true }
  );

  res.json({ data: playlist });
});

// REMOVE VIDEO
playlistRouter.post("/:id/remove",verifyJWT, async (req, res) => {
  const { videoId } = req.body;

  const playlist = await Playlist.findByIdAndUpdate(
    req.params.id,
    { $pull: { videos: videoId } },
    { new: true }
  );

  res.json({ data: playlist });
});

// GET PLAYLIST VIDEOS
playlistRouter.get("/:id",verifyJWT, async (req, res) => {
  const playlist = await Playlist.findById(req.params.id)
    .populate("videos");

  res.json({ data: playlist });
});
// playlistRouter.js
playlistRouter.post("/", verifyJWT, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });

    const playlist = await Playlist.create({
      name,
      owner: req.user._id,
      videos: [] 
    });

    // Make sure 'playlist' is the key name here
    res.status(201).json({ success: true, playlist }); 
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default playlistRouter;