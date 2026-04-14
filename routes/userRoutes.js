import { Router } from "express";
import { logoutUser, forgotPassword, resetPassword } from "../controllers/authController.js";
import { registerUser, verifyOTP, loginUser } from "../controllers/authController.js";
import { getUserProfile } from "../controllers/authController.js";
import { upload } from "../middleware/multerFileUploader.js";
const userRouter = Router();
import { verifyJWT } from "../middleware/authMiddleware.js";
import { getChannelProfile } from "../controllers/channelProfile.js";
import { toggleSubscription } from "../controllers/userController.js";
import { checkSubscriptionStatus } from "../controllers/userController.js";
import { updateWatchProgress } from "../controllers/userController.js";
import { updateAccountDetails , updateUserAvatar, updateUserCoverImage} from "../controllers/userController.js";
// ... existing imports
userRouter.patch("/update-account", verifyJWT, updateAccountDetails);
userRouter.patch("/avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);
userRouter.patch("/cover-image", verifyJWT, upload.single("coverImage"), updateUserCoverImage);

userRouter.post("/logout", logoutUser);
userRouter.post("/register", registerUser);
userRouter.post("/verify-otp", verifyOTP); // New route for OTP
userRouter.post("/login", loginUser);
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);
userRouter.get("/profile", verifyJWT, getUserProfile);
userRouter.get("/c/:username",verifyJWT, getChannelProfile);


import { getWatchHistory, clearWatchHistory, getWatchLater, getUserSubscriptions } from "../controllers/userController.js";


// Private route: Only the logged-in user can see their own history
userRouter.get("/history", verifyJWT, getWatchHistory);
userRouter.patch("/history/progress", verifyJWT, updateWatchProgress);
userRouter.get("/watch-later", verifyJWT, getWatchLater);
userRouter.get("/subscriptions", verifyJWT, getUserSubscriptions);

// Added this for you: A way to wipe the history clean
userRouter.delete("/history/clear", verifyJWT, clearWatchHistory);
userRouter.post("/subscribe/:channelId", verifyJWT, toggleSubscription);
userRouter.get("/is-subscribed/:channelId", verifyJWT, checkSubscriptionStatus);

export default userRouter;