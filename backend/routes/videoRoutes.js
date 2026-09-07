const express = require("express");
const fs = require("fs");

const {
  createJob,
  getJob,
  updateJob
} = require("../services/videoJobService");

const {
  processVideoJob
} = require("../services/videoWorker");

const {
  addVideoToHistory,
  updateVideoHistory,
  getVideoHistory,
  getHistoryItem
} = require("../services/videoHistoryService");

const router = express.Router();


// ==========================================
// CREATE VIDEO JOB
// ==========================================

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

    const totalDuration =
      Number(duration) || 30;

    const sceneDuration = 4;

    const sceneCount = Math.ceil(
      totalDuration / sceneDuration
    );

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

    // Add the new video to history
    addVideoToHistory({
      ...job,
      status: "queued"
    });

    // Start video processing
    processVideoJob(job.id);

    res.json({
      success: true,
      message: "Video job created.",
      jobId: job.id,
      status: "queued",
      totalDuration,
      sceneDuration,
      sceneCount
    });

  } catch (error) {

    console.error(
      "Video job error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create video job.",
      error: error.message
    });
  }
});


// ==========================================
// GET VIDEO JOB
// ==========================================

router.get("/job/:id", (req, res) => {
  try {

    const job = getJob(
      req.params.id
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Video job not found."
      });
    }

    // Keep history updated
    updateVideoHistory(job);

    let videoUrl = null;
    let downloadUrl = null;

    if (
      job.status === "completed"
    ) {

      videoUrl =
        `/api/videos/job/${job.id}/video`;

      downloadUrl =
        `/api/videos/job/${job.id}/download`;
    }

    res.json({
      success: true,
      job,
      videoUrl,
      downloadUrl
    });

  } catch (error) {

    console.error(
      "Job status error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to get video job.",
      error: error.message
    });
  }
});


// ==========================================
// GET VIDEO HISTORY
// ==========================================

router.get("/history", (req, res) => {
  try {

    const history =
      getVideoHistory();

    res.json({
      success: true,
      count: history.length,
      history
    });

  } catch (error) {

    console.error(
      "Video history error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to get video history.",
      error: error.message
    });
  }
});


// ==========================================
// GET ONE HISTORY ITEM
// ==========================================

router.get("/history/:id", (req, res) => {
  try {

    const item =
      getHistoryItem(
        req.params.id
      );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Video history item not found."
      });
    }

    res.json({
      success: true,
      video: item
    });

  } catch (error) {

    console.error(
      "History item error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to get video history item.",
      error: error.message
    });
  }
});


// ==========================================
// STREAM FINISHED VIDEO
// ==========================================

router.get(
  "/job/:id/video",
  (req, res) => {

    try {

      const job =
        getJob(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Video job not found."
        });
      }

      if (
        job.status !== "completed"
      ) {
        return res.status(404).json({
          success: false,
          message: "Video is not ready yet."
        });
      }

      if (!job.finalVideoPath) {
        return res.status(404).json({
          success: false,
          message: "Finished video file not found."
        });
      }

      if (
        !fs.existsSync(
          job.finalVideoPath
        )
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Finished video file is no longer available."
        });
      }

      const stat =
        fs.statSync(
          job.finalVideoPath
        );

      const range =
        req.headers.range;


      // Handle video seeking/range requests

      if (range) {

        const parts =
          range
            .replace(
              /bytes=/,
              ""
            )
            .split("-");

        const start =
          parseInt(
            parts[0],
            10
          );

        const end =
          parts[1]
            ? parseInt(
                parts[1],
                10
              )
            : stat.size - 1;

        const chunkSize =
          end - start + 1;

        const stream =
          fs.createReadStream(
            job.finalVideoPath,
            {
              start,
              end
            }
          );

        res.writeHead(
          206,
          {
            "Content-Range":
              `bytes ${start}-${end}/${stat.size}`,

            "Accept-Ranges":
              "bytes",

            "Content-Length":
              chunkSize,

            "Content-Type":
              "video/mp4"
          }
        );

        stream.pipe(res);

        return;
      }


      // Normal video request

      res.writeHead(
        200,
        {
          "Content-Length":
            stat.size,

          "Content-Type":
            "video/mp4",

          "Accept-Ranges":
            "bytes"
        }
      );

      fs.createReadStream(
        job.finalVideoPath
      ).pipe(res);

    } catch (error) {

      console.error(
        "Video streaming error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to stream video.",
        error: error.message
      });
    }
  }
);


// ==========================================
// DOWNLOAD FINISHED VIDEO
// ==========================================

router.get(
  "/job/:id/download",
  (req, res) => {

    try {

      const job =
        getJob(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Video job not found."
        });
      }

      if (
        job.status !== "completed"
      ) {
        return res.status(404).json({
          success: false,
          message: "Video is not ready yet."
        });
      }

      if (!job.finalVideoPath) {
        return res.status(404).json({
          success: false,
          message: "Finished video file not found."
        });
      }

      if (
        !fs.existsSync(
          job.finalVideoPath
        )
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Finished video file is no longer available."
        });
      }

      res.download(
        job.finalVideoPath,
        `${req.params.id}.mp4`
      );

    } catch (error) {

      console.error(
        "Video download error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to download video.",
        error: error.message
      });
    }
  }
);


module.exports = router;