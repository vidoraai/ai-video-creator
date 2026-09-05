const express = require("express");
const OpenAI = require("openai");

const {
  createJob,
  getJob,
  updateJob
} = require("../services/videoJobService");
const { processVideoJob } = require("../services/videoWorker");
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

    const job = createJob({
      prompt: prompt.trim(),
      totalDuration,
      sceneDuration,
      sceneCount,
      scenes,
      aspectRatio,
      style
    });

    updateJob(job.id, {
      status: "queued"
    });
    processVideoJob(job.id);
    res.json({
      success: true,
      message: "Video job created.",
      jobId: job.id,
      status: job.status,
      totalDuration,
      sceneDuration,
      sceneCount
    });

  } catch (error) {
    console.error("Video job error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create video job.",
      error: error.message
    });
  }
});

router.get("/job/:id", (req, res) => {
  try {
    const job = getJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Video job not found."
      });
    }

    res.json({
      success: true,
      job
    });

  } catch (error) {
    console.error("Job status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get job status.",
      error: error.message
    });
  }
});

module.exports = router;
