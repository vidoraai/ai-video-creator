const express = require("express");
const fs = require("fs");

const router = express.Router();

const {
  createJob,
  getJob
} = require("../services/videoJobService");

const {
  addVideoToHistory,
  updateVideoHistory,
  getVideoHistory,
  getHistoryItem
} = require("../services/videoHistoryService");

const {
  processVideoJob
} = require("../services/videoWorker");


// CREATE VIDEO
router.post(
  "/generate",
  async (req, res) => {
    try {
      const {
        prompt,
        duration,
        aspectRatio,
        style
      } = req.body;

      if (
        !prompt ||
        !prompt.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Video prompt is required."
        });
      }

      const requestedDuration =
        Number(duration);

      if (
        !Number.isFinite(
          requestedDuration
        ) ||
        requestedDuration < 30 ||
        requestedDuration > 3600
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Video duration must be between 30 seconds and 1 hour."
        });
      }

      const totalDuration =
        Math.floor(
          requestedDuration
        );

      const sceneDuration = 4;

      const sceneCount =
        Math.ceil(
          totalDuration /
            sceneDuration
        );

      const scenes = [];

      for (
        let i = 1;
        i <= sceneCount;
        i++
      ) {
        const elapsed =
          (i - 1) *
          sceneDuration;

        const remaining =
          totalDuration -
          elapsed;

        const currentDuration =
          Math.min(
            sceneDuration,
            remaining
          );

        scenes.push({
          sceneNumber: i,
          prompt:
            `${prompt.trim()}. ` +
            `This is scene ${i} of ${sceneCount}. ` +
            `Maintain the same characters, ` +
            `environment, visual style, ` +
            `lighting, and overall continuity ` +
            `throughout the video.`,
          duration:
            currentDuration
        });
      }

      const job =
        await createJob({
          title:
            prompt.trim(),
          prompt:
            prompt.trim(),
          totalDuration,
          sceneDuration,
          sceneCount,
          aspectRatio:
            aspectRatio ||
            "16:9",
          style:
            style ||
            "cinematic",
          scenes
        });

      await addVideoToHistory(
        job
      );

      processVideoJob(
        job.id
      ).catch(
        (error) => {
          console.error(
            "Background video job error:",
            error
          );
        }
      );

      return res.status(202).json({
        success: true,
        message:
          "Video request received.",
        status:
          "queued",
        jobId:
          job.id,
        job
      });

    } catch (error) {
      console.error(
        "Video generation error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to create video job."
      });
    }
  }
);


// GET VIDEO JOB
router.get(
  "/job/:id",
  async (req, res) => {
    try {
      const job =
        await getJob(
          req.params.id
        );

      if (!job) {
        return res.status(404).json({
          success: false,
          message:
            "Video job not found."
        });
      }

      await updateVideoHistory(
        job
      );

      const response = {
        success: true,
        job
      };

      if (
        job.status ===
        "completed"
      ) {
        response.videoUrl =
          `/api/videos/job/${job.id}/video`;

        response.downloadUrl =
          `/api/videos/job/${job.id}/download`;
      }

      return res.json(
        response
      );

    } catch (error) {
      console.error(
        "Get video job error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to get video job."
      });
    }
  }
);


// GET VIDEO HISTORY
router.get(
  "/history",
  async (req, res) => {
    try {
      const history =
        await getVideoHistory();

      return res.json({
        success: true,
        history
      });

    } catch (error) {
      console.error(
        "Get video history error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to load video history."
      });
    }
  }
);


// GET ONE HISTORY ITEM
router.get(
  "/history/:id",
  async (req, res) => {
    try {
      const historyItem =
        await getHistoryItem(
          req.params.id
        );

      if (!historyItem) {
        return res.status(404).json({
          success: false,
          message:
            "History item not found."
        });
      }

      return res.json({
        success: true,
        history:
          historyItem
      });

    } catch (error) {
      console.error(
        "Get history item error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to load history item."
      });
    }
  }
);


// STREAM VIDEO
router.get(
  "/job/:id/video",
  async (req, res) => {
    try {
      const job =
        await getJob(
          req.params.id
        );

      if (!job) {
        return res.status(404).json({
          success: false,
          message:
            "Video job not found."
        });
      }

      if (
        job.status !==
        "completed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Video is not ready yet."
        });
      }

      if (
        !job.finalVideoPath ||
        !fs.existsSync(
          job.finalVideoPath
        )
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Video file not found."
        });
      }

      const filePath =
        job.finalVideoPath;

      const stat =
        fs.statSync(
          filePath
        );

      const fileSize =
        stat.size;

      const range =
        req.headers.range;

      res.setHeader(
        "Content-Type",
        "video/mp4"
      );

      res.setHeader(
        "Accept-Ranges",
        "bytes"
      );

      if (!range) {
        res.setHeader(
          "Content-Length",
          fileSize
        );

        return fs.createReadStream(
          filePath
        ).pipe(res);
      }

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
          : fileSize - 1;

      if (
        Number.isNaN(start) ||
        start < 0 ||
        start >= fileSize ||
        end < start ||
        end >= fileSize
      ) {
        res.status(416);

        res.setHeader(
          "Content-Range",
          `bytes */${fileSize}`
        );

        return res.end();
      }

      const chunkSize =
        end - start + 1;

      res.status(206);

      res.setHeader(
        "Content-Range",
        `bytes ${start}-${end}/${fileSize}`
      );

      res.setHeader(
        "Content-Length",
        chunkSize
      );

      return fs.createReadStream(
        filePath,
        {
          start,
          end
        }
      ).pipe(res);

    } catch (error) {
      console.error(
        "Stream video error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to stream video."
      });
    }
  }
);


// DOWNLOAD VIDEO
router.get(
  "/job/:id/download",
  async (req, res) => {
    try {
      const job =
        await getJob(
          req.params.id
        );

      if (!job) {
        return res.status(404).json({
          success: false,
          message:
            "Video job not found."
        });
      }

      if (
        job.status !==
        "completed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Video is not ready yet."
        });
      }

      if (
        !job.finalVideoPath ||
        !fs.existsSync(
          job.finalVideoPath
        )
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Video file not found."
        });
      }

      return res.download(
        job.finalVideoPath,
        `vidora-video-${job.id}.mp4`
      );

    } catch (error) {
      console.error(
        "Download video error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to download video."
      });
    }
  }
);


module.exports = router;