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


// ==========================================
// VIDEO GENERATION SETTINGS
// ==========================================

const MIN_VIDEO_DURATION = 30;
const MAX_VIDEO_DURATION = 3600;

const MIN_SCENE_DURATION = 2;
const MAX_SCENE_DURATION = 10;

const TARGET_SCENE_DURATION = 9;


// ==========================================
// CREATE SCENE PLAN
// ==========================================

function createScenePlan(
  prompt,
  totalDuration
) {
  const sceneCount =
    Math.ceil(
      totalDuration /
        TARGET_SCENE_DURATION
    );

  const baseDuration =
    Math.floor(
      totalDuration /
        sceneCount
    );

  const remainder =
    totalDuration %
    sceneCount;

  const scenes = [];

  for (
    let i = 1;
    i <= sceneCount;
    i++
  ) {
    const duration =
      baseDuration +
      (
        i <= remainder
          ? 1
          : 0
      );

    if (
      duration <
      MIN_SCENE_DURATION ||
      duration >
      MAX_SCENE_DURATION
    ) {
      throw new Error(
        `Invalid scene duration generated: ${duration} seconds.`
      );
    }

    scenes.push({
      sceneNumber:
        i,

      prompt:
        `${prompt.trim()}. ` +
        `This is scene ${i} of ${sceneCount}. ` +
        `Create a visually coherent continuation ` +
        `of the story. Maintain consistent ` +
        `characters, appearance, clothing, ` +
        `environment, time of day, lighting, ` +
        `camera style, color treatment, and ` +
        `overall visual identity throughout ` +
        `the entire video.`,

      duration
    });
  }

  return scenes;
}


// ==========================================
// CREATE VIDEO
// ==========================================

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


      // ======================================
      // VALIDATE PROMPT
      // ======================================

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


      // ======================================
      // VALIDATE DURATION
      // ======================================

      const requestedDuration =
        Number(duration);

      if (
        !Number.isFinite(
          requestedDuration
        ) ||
        requestedDuration <
          MIN_VIDEO_DURATION ||
        requestedDuration >
          MAX_VIDEO_DURATION
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


      // ======================================
      // CREATE REAL SCENE PLAN
      // ======================================

      const scenes =
        createScenePlan(
          prompt,
          totalDuration
        );

      const sceneCount =
        scenes.length;


      console.log(
        `Creating ${sceneCount} scenes for ${totalDuration}-second video`
      );


      // ======================================
      // CREATE DATABASE JOB
      // ======================================

      const job =
        await createJob({
          title:
            prompt.trim(),

          prompt:
            prompt.trim(),

          totalDuration,

          sceneDuration:
            TARGET_SCENE_DURATION,

          sceneCount,

          aspectRatio:
            aspectRatio ||
            "16:9",

          style:
            style ||
            "cinematic",

          scenes
        });


      // ======================================
      // ADD TO HISTORY
      // ======================================

      await addVideoToHistory(
        job
      );


      // ======================================
      // START REAL BACKGROUND JOB
      // ======================================

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


      // ======================================
      // RETURN JOB
      // ======================================

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


// ==========================================
// GET VIDEO JOB
// ==========================================

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


// ==========================================
// GET VIDEO HISTORY
// ==========================================

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


// ==========================================
// GET ONE HISTORY ITEM
// ==========================================

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


// ==========================================
// STREAM VIDEO
// ==========================================

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

        return fs
          .createReadStream(
            filePath
          )
          .pipe(res);
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


      return fs
        .createReadStream(
          filePath,
          {
            start,
            end
          }
        )
        .pipe(res);

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


// ==========================================
// DOWNLOAD VIDEO
// ==========================================

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


// ==========================================
// EXPORT
// ==========================================

module.exports = router;