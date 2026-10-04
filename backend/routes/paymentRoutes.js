const express = require("express");

const {
  initializePayment,
  verifyPayment,
  getVideoPrice
} = require("../services/paymentService");

const {
  getJob
} = require("../services/videoJobService");

const {
  processVideoJob
} = require("../services/videoWorker");

const {
  pool
} = require("../services/database");

const {
  requireAuth
} = require("../middleware/authMiddleware");

const router = express.Router();


// INITIALIZE PAYMENT
router.post("/initialize", requireAuth, async (req, res) => {
  try {
    const {
      email,
      duration,
      jobId
    } = req.body;

    const userId = req.user.id;

    const amount = getVideoPrice(duration);

    const payment = await initializePayment({
      email,
      duration,
      userId,
      jobId
    });

    return res.status(200).json({
      success: true,
      message: "Payment initialized.",
      ...payment,
      amount
    });

  } catch (error) {
    console.error(
      "Payment initialization error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Unable to initialize payment."
    });
  }
});


// VERIFY PAYMENT
router.get(
  "/verify/:reference",
  requireAuth,
  async (req, res) => {
    try {
      const reference =
        req.params.reference;

      const userId =
        req.user.id;

      const paymentResult =
        await verifyPayment(
          reference,
          null,
          userId
        );

      if (!paymentResult.paid) {
        return res.status(400).json({
          success: false,
          paid: false,
          message:
            "Payment has not been completed."
        });
      }

      const jobId =
        paymentResult.jobId;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          paid: true,
          message:
            "Payment succeeded but no video job was found."
        });
      }

      const job =
        await getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          paid: true,
          message:
            "Video job not found."
        });
      }

      if (
        String(job.userId) !==
        String(userId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not own this video job."
        });
      }

      const claimResult =
        await pool.query(
          `
          UPDATE video_jobs
          SET
            status = 'paid',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND status = 'queued'
          RETURNING id
          `,
          [jobId]
        );

      if (claimResult.rows.length > 0) {

        processVideoJob(jobId)
          .catch(error => {
            console.error(
              "Video processing error:",
              error
            );
          });

        return res.json({
          success: true,
          paid: true,
          status: "paid",
          jobId: String(jobId),
          message:
            "Payment verified. Video generation started."
        });
      }

      const currentJob =
        await getJob(jobId);

      return res.json({
        success: true,
        paid: true,
        status:
          currentJob?.status ||
          "processing",
        jobId: String(jobId),
        message:
          "Payment already verified. Video job is already processing."
      });

    } catch (error) {
      console.error(
        "Payment verification error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Unable to verify payment."
      });
    }
  }
);


module.exports = router;