import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.ai_key);

export const generateVideoSummary = async (audioPath) => {

  const audioFile = fs.readFileSync(audioPath);

  // 🔁 retry system
  for (let attempt = 0; attempt < 4; attempt++) {
    try {

      console.log(`🤖 Gemini attempt ${attempt + 1}`);

      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.5-flash"
      });

      // 🎙️ Audio → Text
      const transcriptRes = await model.generateContent([
        {
          inlineData: {
            data: audioFile.toString("base64"),
            mimeType: "audio/mp3"
          }
        },
        {
          text: "Convert this audio into a clean transcript."
        }
      ]);

      const transcript = transcriptRes.response.text().slice(0, 4000);

      // ✨ Text → Summary
      const summaryRes = await model.generateContent(
        `Summarize this video in 5 bullet points:\n${transcript}`
      );

      const summary = summaryRes.response.text();

      return { transcript, summary };

    } catch (err) {

      console.log(`⚠ Attempt ${attempt + 1} failed:`, err.message);

      // 🔥 if last attempt → fallback model
      if (attempt === 2) {
        try {
          console.log("⚡ Switching to fallback model...");

          const fallbackModel = genAI.getGenerativeModel({
            model: "models/gemini-flash-lite-latest"
          });

          const transcriptRes = await fallbackModel.generateContent([
            {
              inlineData: {
                data: audioFile.toString("base64"),
                mimeType: "audio/mp3"
              }
            },
            {
              text: "Convert this audio into a short transcript."
            }
          ]);

          const transcript = transcriptRes.response.text().slice(0, 3000);

          const summaryRes = await fallbackModel.generateContent(
            `Summarize briefly:\n${transcript}`
          );

          const summary = summaryRes.response.text();

          return { transcript, summary };

        } catch (fallbackErr) {
          console.log("❌ Fallback also failed:", fallbackErr.message);
        }
      }

      // ❌ last retry → return safe fallback
      if (attempt === 3) {
        return {
          transcript: "",
          summary: "Summary not available"
        };
      }

      // ⏳ exponential delay
      const delay = (attempt + 1) * 5000;
      await new Promise(res => setTimeout(res, delay));
    }
  }
};