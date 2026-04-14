import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.ai_key);

async function test() {
  try {
    const model = genAI.getGenerativeModel({
      model: "models/gemini-2.5-flash"   // ✅ FINAL FIX
    });

    const result = await model.generateContent("Explain AI in 2 lines");
    console.log("✅ RESPONSE:\n", result.response.text());

  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

test();