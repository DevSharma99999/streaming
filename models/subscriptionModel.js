import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber: {
        type: mongoose.Schema.Types.ObjectId, // The person who is FOLLOWING
        ref: "User"
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId, // The person BEING FOLLOWED
        ref: "User"
    }
}, { timestamps: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);