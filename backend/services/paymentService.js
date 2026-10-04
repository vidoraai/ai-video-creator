const PAYSTACK_API_URL =
  "https://api.paystack.co";

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

  if (!VIDEO_PRICES[seconds]) {
    throw new Error(
      "Unsupported video duration."
    );
  }

  return VIDEO_PRICES[seconds];
}

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

  const amount =
    getVideoPrice(duration);

  const reference =
    `VIDORA-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()}`;

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

          metadata: {
            userId,
            jobId,
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

  return {
    reference:
      data.data.reference,

    authorizationUrl:
      data.data.authorization_url,

    accessCode:
      data.data.access_code,

    amount
  };
}

async function verifyPayment(
  reference,
  expectedAmount
) {
  if (!reference) {
    throw new Error(
      "Payment reference is required."
    );
  }

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
    Number(expectedAmount);

  const paid =
    Number(transaction.amount);

  if (
    transaction.status !==
    "success"
  ) {
    return {
      paid: false,

      status:
        transaction.status,

      reference:
        transaction.reference
    };
  }

  if (
    expected &&
    paid !== expected
  ) {
    throw new Error(
      "Payment amount does not match the required video price."
    );
  }

  return {
    paid: true,

    status:
      transaction.status,

    reference:
      transaction.reference,

    amount:
      paid,

    currency:
      transaction.currency,

    paidAt:
      transaction.paid_at,

    customerEmail:
      transaction.customer?.email ||
      null
  };
}

module.exports = {
  VIDEO_PRICES,
  getVideoPrice,
  initializePayment,
  verifyPayment
};