const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Video prompt is required."
      });
    }

    const video = await openai.videos.create({
      model: "sora-2",
      prompt: prompt.trim()
    });

    res.json({
      success: true,
      message: "Video generation started.",
      id: video.id,
      status: video.status
    });

  } catch (error) {
    console.error("Video generation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to start video generation.",
      error: error.message
    });
  }
});

module.exports = router;
