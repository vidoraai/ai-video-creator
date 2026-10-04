const express = require("express");

const router =
  express.Router();

const {
  requireAuth
} = require("../middleware/authMiddleware");

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

const {
  getVideoUrl,
  videoExists
} = require("../services/videoStorage");


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
// CHECK JOB OWNERSHIP
// ==========================================

function ownsJob(
  job,
  userId
) {
  if (
    !job ||
    !job.userId ||
    !userId
  ) {
    return false;
  }

  return (
    String(job.userId) ===
    String(userId)
  );
}


// ==========================================
// CREATE VIDEO
// ==========================================

router.post(
  "/generate",
  requireAuth,
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

      console.log(
        `Authenticated user: ${req.user.id}`
      );

      const job =
        await createJob({
          userId:
            req.user.id,

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


// ==========================================
// GET VIDEO JOB
// ==========================================

router.get(
  "/job/:id",
  requireAuth,
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
        !ownsJob(
          job,
          req.user.id
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this video job."
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
        try {
          const exists =
            await videoExists(
              job.id
            );

          if (exists) {
            const signedUrl =
              await getVideoUrl(
                job.id
              );

            response.videoUrl =
              signedUrl;

            response.downloadUrl =
              signedUrl;
          }
        } catch (storageError) {
          console.error(
            "R2 video check error:",
            storageError
          );
        }
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
  requireAuth,
  async (req, res) => {
    try {
      const history =
        await getVideoHistory(
          req.user.id
        );

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
  requireAuth,
  async (req, res) => {
    try {
      const historyItem =
        await getHistoryItem(
          req.params.id,
          req.user.id
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
// STREAM / PLAY VIDEO
// ==========================================

router.get(
  "/job/:id/video",
  requireAuth,
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
        !ownsJob(
          job,
          req.user.id
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this video."
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
        !job.finalVideoPath
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Video storage information was not found."
        });
      }

      const exists =
        await videoExists(
          job.id
        );

      if (!exists) {
        return res.status(404).json({
          success: false,
          message:
            "Video file was not found in storage."
        });
      }

      const signedUrl =
        await getVideoUrl(
          job.id
        );

      return res.redirect(
        signedUrl
      );

    } catch (error) {
      console.error(
        "Stream video error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to play video."
      });
    }
  }
);


// ==========================================
// DOWNLOAD VIDEO
// ==========================================

router.get(
  "/job/:id/download",
  requireAuth,
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
        !ownsJob(
          job,
          req.user.id
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this video."
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
        !job.finalVideoPath
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Video storage information was not found."
        });
      }

      const exists =
        await videoExists(
          job.id
        );

      if (!exists) {
        return res.status(404).json({
          success: false,
          message:
            "Video file was not found in storage."
        });
      }

      const signedUrl =
        await getVideoUrl(
          job.id
        );

      return res.redirect(
        signedUrl
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

module.exports =
  router;