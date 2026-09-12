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


      // --------------------------------------
      // Validate prompt
      // --------------------------------------

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


      // --------------------------------------
      // Video settings
      // --------------------------------------

      const totalDuration =
        Number(duration) || 30;

      const sceneDuration = 4;


      const sceneCount =
        Math.ceil(
          totalDuration /
          sceneDuration
        );


      // --------------------------------------
      // Create scenes
      // --------------------------------------

      const scenes =
        Array.from(
          {
            length:
              sceneCount
          },

          (_, index) => ({

            sceneNumber:
              index + 1,

            duration:
              sceneDuration,

            prompt:
              `${prompt.trim()}. ` +
              `Style: ${
                style ||
                "cinematic"
              }. ` +
              `Scene ${
                index + 1
              } of ${
                sceneCount
              }.`

          })
        );


      // --------------------------------------
      // Create database job
      // --------------------------------------

      const job =
        await createJob({

          title:
            prompt.trim()
              .substring(0, 100),

          prompt:
            prompt.trim(),

          totalDuration:
            totalDuration,

          sceneDuration:
            sceneDuration,

          sceneCount:
            sceneCount,

          scenes:
            scenes,

          aspectRatio:
            aspectRatio ||
            "16:9",

          style:
            style ||
            "cinematic",

          provider:
            process.env
              .VIDORA_VIDEO_PROVIDER ||
            "openai"

        });


      // --------------------------------------
      // Add to history
      // --------------------------------------

      addVideoToHistory({

        ...job,

        status:
          "queued"

      });


      // --------------------------------------
      // Start processing
      // --------------------------------------

      processVideoJob(
        job.id
      ).catch(
        (error) => {

          console.error(
            "Background video processing error:",
            error
          );

        }
      );


      // --------------------------------------
      // Send response
      // --------------------------------------

      return res.json({

        success: true,

        message:
          "Video job created.",

        jobId:
          job.id,

        status:
          job.status,

        totalDuration:
          totalDuration,

        sceneDuration:
          sceneDuration,

        sceneCount:
          sceneCount

      });


    } catch (error) {

      console.error(
        "Video job error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to create video job.",

        error:
          error.message

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


      // Keep history updated
      updateVideoHistory(
        job
      );


      let videoUrl =
        null;

      let downloadUrl =
        null;


      // --------------------------------------
      // Finished video URLs
      // --------------------------------------

      if (
        job.status ===
        "completed"
      ) {

        videoUrl =
          `/api/videos/job/${job.id}/video`;

        downloadUrl =
          `/api/videos/job/${job.id}/download`;
      }


      return res.json({

        success: true,

        job:

          job,

        videoUrl:

          videoUrl,

        downloadUrl:

          downloadUrl

      });


    } catch (error) {

      console.error(
        "Job status error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to get video job.",

        error:
          error.message

      });

    }

  }
);


// ==========================================
// GET VIDEO HISTORY
// ==========================================

router.get(
  "/history",
  (req, res) => {

    try {

      const history =
        getVideoHistory();


      return res.json({

        success: true,

        count:
          history.length,

        history:
          history

      });


    } catch (error) {

      console.error(
        "Video history error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to get video history.",

        error:
          error.message

      });

    }

  }
);


// ==========================================
// GET ONE HISTORY ITEM
// ==========================================

router.get(
  "/history/:id",
  (req, res) => {

    try {

      const item =
        getHistoryItem(
          req.params.id
        );


      if (!item) {

        return res.status(404).json({

          success: false,

          message:
            "Video history item not found."

        });
      }


      return res.json({

        success: true,

        video:
          item

      });


    } catch (error) {

      console.error(
        "History item error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to get video history item.",

        error:
          error.message

      });

    }

  }
);


// ==========================================
// STREAM FINISHED VIDEO
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

        return res.status(404).json({

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
            "Finished video file not found."

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


      // --------------------------------------
      // Range request
      // --------------------------------------

      if (range) {

        const parts =
          range
            .replace(
              /bytes=/,
              ""
            )
            .split("-");


        let start =
          parseInt(
            parts[0],
            10
          );


        let end =
          parts[1]
            ? parseInt(
                parts[1],
                10
              )
            : stat.size - 1;


        if (
          Number.isNaN(start)
        ) {
          start = 0;
        }


        if (
          Number.isNaN(end) ||
          end >= stat.size
        ) {
          end =
            stat.size - 1;
        }


        if (
          start > end ||
          start >= stat.size
        ) {

          return res.status(416).send(
            "Requested range not satisfiable"
          );
        }


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


      // --------------------------------------
      // Normal video request
      // --------------------------------------

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


      return res.status(500).json({

        success: false,

        message:
          "Unable to stream video.",

        error:
          error.message

      });

    }

  }
);


// ==========================================
// DOWNLOAD FINISHED VIDEO
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

        return res.status(404).json({

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
            "Finished video file not found."

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


      return res.download(

        job.finalVideoPath,

        `${req.params.id}.mp4`

      );


    } catch (error) {

      console.error(
        "Video download error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to download video.",

        error:
          error.message

      });

    }

  }
);


module.exports = router;