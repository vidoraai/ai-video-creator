const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
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

    const video = await client.videos.create({
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
router.get("/:id/content", async (req, res) => {
  try {
    const response = await client.videos.downloadContent(req.params.id);

    const buffer = Buffer.from(await response.arrayBuffer());

    res.set("Content-Type", "video/mp4");
    res.send(buffer);

  } catch (error) {
    console.error("Video content error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to download video.",
      error: error.message
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
  const video = await client.videos.retrieve(req.params.id);

    res.json({
      success: true,
      id: video.id,
      status: video.status,
      progress: video.progress,
      video
    });

  } catch (error) {
    console.error("Video status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check video status.",
      error: error.message
    });
  }
});
module.exports = router;
