import express, { urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import env from 'dotenv';
env.config();
import "./utils/videoQueue.js";
const app=express();
//here import route
import userRouter from './routes/userRoutes.js'; 
import videoRouter from './routes/videoRoute.js';
import commentRouter from './routes/commentroutes.js';
import playlistRouter from './routes/playlistRoute.js';
import aiRouter from './routes/aiRoutes.js';

import path from 'path';
import { fileURLToPath } from 'url';

// These two lines are needed to handle paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Route to serve the HTML test page
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

//here use
app.use(cors({
  origin: [
    'https://streamin-ak-gamma.vercel.app', 
    'http://localhost:5173' // Keep this for local testing
  ],
  credentials: true
}));
// We need higher limits for video metadata and large payloads
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use("/api/v1/users", userRouter);   // This enables /api/v1/users/login
app.use("/api/v1/videos", videoRouter);
app.get('/', (req,res)=>{
    res.send("helllo let's stream");
});
app.use("/api/v1/comments",commentRouter);
app.use("/api/v1/playlists",playlistRouter);

app.use("/api/ai",aiRouter);



//here app and mongoose connection
const port=process.env.PORT;
mongoose.connect(process.env.mongooseKey).then( ()=>{
    console.log("connect to mongoose");
    app.listen(port, ()=>{
        console.log(`app is running on http://localhost:${port}`);
    });
    })
    .catch((err)=>{
        console.log("errror ,app not running",err);
    });

