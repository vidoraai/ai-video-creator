const express = require("express");

const {
  initializePayment,
  verifyPayment,
  getVideoPrice
} = require("../services/paymentService");

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

      return res.json({
        success: true,
        ...result
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