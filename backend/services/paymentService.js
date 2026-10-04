const {
  pool
} = require("./database");


const PAYSTACK_API_URL =
  "https://api.paystack.co";


const VIDORA_FRONTEND_URL =
  process.env.VIDORA_FRONTEND_URL ||
  "https://vidoraai.github.io/ai-video-creator/frontend/";


const VIDEO_PRICES = {
  30: 1299900,
  60: 2499900,
  300: 8999900,
  600: 16999900,
  1800: 49999900,
  3600: 99999900
};


function getSecretKey() {

  const secretKey =
    process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Paystack secret key is not configured."
    );
  }

  return secretKey;
}


function getVideoPrice(duration) {

  const seconds =
    Number(duration);

  if (
    !VIDEO_PRICES[seconds]
  ) {
    throw new Error(
      "Unsupported video duration."
    );
  }

  return VIDEO_PRICES[seconds];
}


// ==========================================
// INITIALIZE PAYMENT
// ==========================================

async function initializePayment({
  email,
  duration,
  userId,
  jobId
}) {

  if (!email) {
    throw new Error(
      "Customer email is required."
    );
  }

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }


  const amount =
    getVideoPrice(duration);


  // ========================================
  // VERIFY VIDEO JOB
  // ========================================

  if (jobId) {

    const jobResult =
      await pool.query(
        `
        SELECT
          j.id,
          p.user_id,
          j.total_duration
        FROM video_jobs j
        INNER JOIN video_projects p
          ON p.id = j.project_id
        WHERE j.id = $1
        `,
        [jobId]
      );


    if (
      jobResult.rows.length === 0
    ) {
      throw new Error(
        "Video job not found."
      );
    }


    const job =
      jobResult.rows[0];


    if (
      String(job.user_id) !==
      String(userId)
    ) {
      throw new Error(
        "You do not have access to this video job."
      );
    }


    if (
      Number(job.total_duration) !==
      Number(duration)
    ) {
      throw new Error(
        "Payment duration does not match the video job."
      );
    }
  }


  // ========================================
  // CREATE UNIQUE PAYMENT REFERENCE
  // ========================================

  const reference =
    `VIDORA-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;


  // ========================================
  // PAYSTACK INITIALIZATION
  // ========================================

  const response =
    await fetch(
      `${PAYSTACK_API_URL}/transaction/initialize`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${getSecretKey()}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          email,

          amount:
            String(amount),

          currency:
            "NGN",

          reference,

          // Return customer to Vidora
          // after Paystack payment.
          callback_url:
            VIDORA_FRONTEND_URL,

          metadata: {

            userId,

            jobId:
              jobId || null,

            duration,

            product:
              "Vidora AI video generation"
          }
        })
      }
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.status
  ) {

    throw new Error(
      data.message ||
      "Unable to initialize Paystack payment."
    );
  }


  const authorizationUrl =
    data.data.authorization_url;


  if (
    !authorizationUrl
  ) {

    throw new Error(
      "Paystack did not return a payment authorization URL."
    );
  }


  // ========================================
  // SAVE PAYMENT RECORD
  // ========================================

  await pool.query(
    `
    INSERT INTO payments (
      user_id,
      job_id,
      reference,
      amount,
      currency,
      duration,
      status,
      authorization_url
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8
    )
    `,
    [
      userId,

      jobId ||
        null,

      data.data.reference,

      amount,

      "NGN",

      duration,

      "initialized",

      authorizationUrl
    ]
  );


  return {

    reference:
      data.data.reference,

    authorizationUrl,

    accessCode:
      data.data.access_code,

    amount
  };
}


// ==========================================
// VERIFY PAYMENT
// ==========================================

async function verifyPayment(
  reference,
  expectedAmount,
  userId
) {

  if (!reference) {
    throw new Error(
      "Payment reference is required."
    );
  }

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }


  // ========================================
  // FIND PAYMENT
  // ========================================

  const paymentResult =
    await pool.query(
      `
      SELECT
        id,
        user_id,
        job_id,
        amount,
        currency,
        duration,
        status
      FROM payments
      WHERE reference = $1
      `,
      [reference]
    );


  if (
    paymentResult.rows.length === 0
  ) {

    throw new Error(
      "Payment record was not found."
    );
  }


  const payment =
    paymentResult.rows[0];


  // ========================================
  // VERIFY OWNERSHIP
  // ========================================

  if (
    String(payment.user_id) !==
    String(userId)
  ) {

    throw new Error(
      "You do not have access to this payment."
    );
  }


  // ========================================
  // ALREADY VERIFIED
  // ========================================

  if (
    payment.status ===
    "success"
  ) {

    return {

      paid:
        true,

      status:
        "success",

      reference,

      amount:
        Number(payment.amount),

      currency:
        payment.currency,

      duration:
        Number(payment.duration),

      jobId:
        payment.job_id
    };
  }


  // ========================================
  // ASK PAYSTACK FOR PAYMENT STATUS
  // ========================================

  const response =
    await fetch(
      `${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${getSecretKey()}`
        }
      }
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.status
  ) {

    throw new Error(
      data.message ||
      "Unable to verify Paystack payment."
    );
  }


  const transaction =
    data.data;


  const expected =
    Number(
      expectedAmount ||
      payment.amount
    );


  const paid =
    Number(
      transaction.amount
    );


  // ========================================
  // PAYMENT NOT SUCCESSFUL
  // ========================================

  if (
    transaction.status !==
    "success"
  ) {

    await pool.query(
      `
      UPDATE payments
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE reference = $2
      `,
      [
        transaction.status ||
        "failed",

        reference
      ]
    );


    return {

      paid:
        false,

      status:
        transaction.status,

      reference,

      amount:
        paid,

      jobId:
        payment.job_id
    };
  }


  // ========================================
  // CHECK AMOUNT
  // ========================================

  if (
    paid !== expected
  ) {

    await pool.query(
      `
      UPDATE payments
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE reference = $2
      `,
      [
        "amount_mismatch",

        reference
      ]
    );


    throw new Error(
      "Payment amount does not match the required video price."
    );
  }


  if (
    paid !==
    Number(payment.amount)
  ) {

    await pool.query(
      `
      UPDATE payments
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE reference = $2
      `,
      [
        "amount_mismatch",

        reference
      ]
    );


    throw new Error(
      "Payment amount does not match the stored payment amount."
    );
  }


  // ========================================
  // MARK PAYMENT AS SUCCESSFUL
  // ========================================

  await pool.query(
    `
    UPDATE payments
    SET
      status = $1,
      paid_at = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE reference = $3
    `,
    [
      "success",

      transaction.paid_at
        ? new Date(
            transaction.paid_at
          )
        : new Date(),

      reference
    ]
  );


  return {

    paid:
      true,

    status:
      "success",

    reference,

    amount:
      paid,

    currency:
      transaction.currency,

    duration:
      Number(payment.duration),

    paidAt:
      transaction.paid_at,

    customerEmail:
      transaction.customer?.email ||
      null,

    jobId:
      payment.job_id
  };
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {

  VIDEO_PRICES,

  getVideoPrice,

  initializePayment,

  verifyPayment
};