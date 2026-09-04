const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/generate", async (req, res) => {
  try {
    const {
      prompt,
      duration,
      aspectRatio,
      style
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Video prompt is required."
      });
    }

    const totalDuration = Number(duration) || 30;
    const sceneDuration = 4;
    const sceneCount = Math.ceil(totalDuration / sceneDuration);

    const scenes = Array.from(
      { length: sceneCount },
      (_, index) => ({
        sceneNumber: index + 1,
        duration: sceneDuration,
        prompt:
          `${prompt.trim()}. ` +
          `Style: ${style || "cinematic"}. ` +
          `Scene ${index + 1} of ${sceneCount}.`
      })
    );

    const video = await client.videos.create({
      model: "sora-2",
      prompt: scenes[0].prompt,
      seconds: 4,
      size:
        aspectRatio === "9:16"
          ? "720x1280"
          : "1280x720"
    });

    res.json({
      success: true,
      message: "Video generation started.",
      id: video.id,
      status: video.status,
      totalDuration,
      sceneDuration,
      sceneCount,
      scenes
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
    const response =
      await client.videos.downloadContent(req.params.id);

    const buffer =
      Buffer.from(await response.arrayBuffer());

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
    const video =
      await client.videos.retrieve(req.params.id);

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