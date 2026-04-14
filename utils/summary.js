import { generateVideoSummary } from "../utils/aiServices.js";

export const processVideoSummaryJob = async (audioPath) => {
  try {
    console.log("🚀 Job Started");
    const { transcript, summary } = await generateVideoSummary(audioPath);
    return { transcript, summary };
  } catch (error) {
    console.error("❌ Job Failed:", error);
  }
};