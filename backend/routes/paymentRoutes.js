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

const requireAuth =
  require("../middleware/authMiddleware");

const router =
  express.Router();


// ==========================================
// INITIALIZE PAYMENT
// ==========================================

router.post(
  "/initialize",
  requireAuth,
  async (req, res) => {
    try {
      const {
        duration,
        jobId
      } = req.body;

      const seconds =
        Number(duration);

      if (
        !Number.isInteger(seconds)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Video duration must be a whole number."
        });
      }

      const amount =
        getVideoPrice(seconds);

      const payment =
        await initializePayment({
          email:
            req.user.email,

          duration:
            seconds,

          userId:
            req.user.id,

          jobId:
            jobId || null
        });

      return res.json({
        success: true,

        message:
          "Payment initialized.",

        amount,

        currency:
          "NGN",

        reference:
          payment.reference,

        authorizationUrl:
          payment.authorizationUrl,

        accessCode:
          payment.accessCode,

        jobId:
          jobId || null
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
  }
);


// ==========================================
// VERIFY PAYMENT
// ==========================================

router.get(
  "/verify/:reference",
  requireAuth,
  async (req, res) => {
    try {
      const result =
        await verifyPayment(
          req.params.reference,
          null,
          req.user.id
        );

      // Payment has not been completed.
      if (
        !result.paid
      ) {
        return res.json({
          success: true,
          ...result,
          message:
            "Payment has not been completed."
        });
      }

      // A successful payment must belong
      // to a video job before generation starts.
      if (
        !result.jobId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment was successful, but no video job is attached to it."
        });
      }

      const job =
        await getJob(
          result.jobId
        );

      if (!job) {
        return res.status(404).json({
          success: false,
          message:
            "The video job associated with this payment was not found."
        });
      }

      // Extra ownership protection.
      if (
        String(job.userId) !==
        String(req.user.id)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to start this video job."
        });
      }

      // Atomically claim the job.
      //
      // Only the first successful request can
      // change queued -> paid.
      //
      // This prevents duplicate video generation
      // if the verification endpoint is called twice.
      const claimResult =
        await pool.query(
          `
          UPDATE video_jobs
          SET
            status = 'paid',
            updated_at = CURRENT_TIMESTAMP
          WHERE
            id = $1
            AND status = 'queued'
          RETURNING id
          `,
          [
            result.jobId
          ]
        );

      // We successfully claimed the job.
      if (
        claimResult.rows.length === 1
      ) {
        processVideoJob(
          result.jobId
        ).catch(
          (error) => {
            console.error(
              "Video worker failed:",
              error
            );
          }
        );

        return res.json({
          success: true,

          paid: true,

          status:
            "paid",

          reference:
            result.reference,

          jobId:
            result.jobId,

          message:
            "Payment verified. Video generation has started."
        });
      }

      // The job was already claimed previously.
      const currentJob =
        await getJob(
          result.jobId
        );

      return res.json({
        success: true,

        paid: true,

        status:
          currentJob
            ? currentJob.status
            : "processing",

        reference:
          result.reference,

        jobId:
          result.jobId,

        message:
          "Payment already verified and video generation is already in progress or complete."
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
          "Unable to verify Paystack payment."
      });
    }
  }
);


// ==========================================
// EXPORT
// ==========================================

module.exports =
  router;