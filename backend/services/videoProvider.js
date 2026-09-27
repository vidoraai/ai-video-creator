const RunwayML = require("@runwayml/sdk");


// ==========================================
// CONFIGURATION
// ==========================================

const RUNWAY_MODEL =
  process.env.RUNWAY_MODEL || "gen4.5";

const MIN_DURATION = 2;
const MAX_DURATION = 10;


// ==========================================
// GET RUNWAY CLIENT
// ==========================================

function getClient() {
  const apiKey =
    process.env.RUNWAY_API_KEY ||
    process.env.RUNWAYML_API_SECRET;

  if (!apiKey) {
    throw new Error(
      "Runway API credentials are not configured."
    );
  }

  return new RunwayML({
    apiKey
  });
}


// ==========================================
// NORMALIZE STATUS
// ==========================================

function normalizeStatus(status) {
  if (!status) {
    return "processing";
  }

  const normalized =
    String(status).toUpperCase();

  if (normalized === "SUCCEEDED") {
    return "completed";
  }

  if (normalized === "FAILED") {
    return "failed";
  }

  if (
    normalized === "CANCELED" ||
    normalized === "CANCELLED"
  ) {
    return "cancelled";
  }

  return "processing";
}


// ==========================================
// CREATE VIDEO
// ==========================================

async function createVideo({
  prompt,
  seconds,
  size
}) {
  if (
    !prompt ||
    !String(prompt).trim()
  ) {
    throw new Error(
      "Video prompt is required."
    );
  }

  const client =
    getClient();


  // ========================================
  // ASPECT RATIO
  // ========================================

  let ratio =
    "1280:720";

  if (
    size === "720x1280"
  ) {
    ratio =
      "720:1280";
  }


  // ========================================
  // DURATION
  // Gen-4.5 supports 2–10 seconds
  // ========================================

  const requestedSeconds =
    Number(seconds);

  const duration =
    Math.max(
      MIN_DURATION,
      Math.min(
        MAX_DURATION,
        Number.isFinite(
          requestedSeconds
        )
          ? Math.round(
              requestedSeconds
            )
          : 4
      )
    );


  // ========================================
  // CREATE REAL RUNWAY VIDEO TASK
  // ========================================

  console.log(
    "Starting Runway video generation..."
  );

  console.log(
    `Model: ${RUNWAY_MODEL}`
  );

  console.log(
    `Duration: ${duration}s`
  );

  console.log(
    `Ratio: ${ratio}`
  );

  const task =
    await client.imageToVideo.create({
      model:
        RUNWAY_MODEL,

      promptText:
        String(prompt).trim(),

      ratio,

      duration
    });


  if (
    !task ||
    !task.id
  ) {
    throw new Error(
      "Runway did not return a video task ID."
    );
  }


  console.log(
    `Runway task created: ${task.id}`
  );


  return {
    id:
      task.id,

    status:
      "processing",

    provider:
      "runway",

    model:
      RUNWAY_MODEL,

    requestedDuration:
      requestedSeconds,

    duration,

    ratio
  };
}


// ==========================================
// GET VIDEO STATUS
// ==========================================

async function getVideoStatus(
  videoId
) {
  if (
    !videoId
  ) {
    throw new Error(
      "Runway video task ID is required."
    );
  }

  const client =
    getClient();

  const task =
    await client.tasks.retrieve(
      videoId
    );


  const status =
    normalizeStatus(
      task.status
    );


  console.log(
    `Runway task ${videoId}: ${task.status}`
  );


  // ========================================
  // COMPLETED
  // ========================================

  if (
    status === "completed"
  ) {
    return {
      id:
        videoId,

      status:
        "completed",

      output:
        task.output || []
    };
  }


  // ========================================
  // FAILED
  // ========================================

  if (
    status === "failed"
  ) {
    const failureMessage =
      task.failure ||
      task.failureCode ||
      task.error ||
      "Runway video generation failed.";

    return {
      id:
        videoId,

      status:
        "failed",

      error:
        failureMessage
    };
  }


  // ========================================
  // CANCELLED
  // ========================================

  if (
    status === "cancelled"
  ) {
    return {
      id:
        videoId,

      status:
        "cancelled"
    };
  }


  // ========================================
  // STILL PROCESSING
  // ========================================

  return {
    id:
      videoId,

    status:
      "processing"
  };
}


// ==========================================
// DOWNLOAD VIDEO
// ==========================================

async function downloadVideo(
  videoId
) {
  if (
    !videoId
  ) {
    throw new Error(
      "Runway video task ID is required."
    );
  }

  const client =
    getClient();


  // ========================================
  // GET COMPLETED RUNWAY TASK
  // ========================================

  const task =
    await client.tasks.retrieve(
      videoId
    );


  const status =
    normalizeStatus(
      task.status
    );


  if (
    status !== "completed"
  ) {
    throw new Error(
      `Runway video is not completed. Current status: ${task.status}`
    );
  }


  // ========================================
  // GET OUTPUT URL
  // ========================================

  if (
    !task.output ||
    !Array.isArray(task.output) ||
    !task.output[0]
  ) {
    throw new Error(
      "Runway did not return a video output URL."
    );
  }


  const videoUrl =
    task.output[0];


  console.log(
    `Downloading completed Runway video for task ${videoId}`
  );


  // ========================================
  // DOWNLOAD REAL VIDEO
  // ========================================

  const response =
    await fetch(
      videoUrl
    );


  if (
    !response.ok
  ) {
    throw new Error(
      `Unable to download Runway video: HTTP ${response.status}`
    );
  }


  const arrayBuffer =
    await response.arrayBuffer();


  const buffer =
    Buffer.from(
      arrayBuffer
    );


  if (
    buffer.length === 0
  ) {
    throw new Error(
      "Runway returned an empty video file."
    );
  }


  console.log(
    `Downloaded Runway video: ${buffer.length} bytes`
  );


  return buffer;
}


// ==========================================
// PROVIDER NAME
// ==========================================

function getProviderName() {
  return "runway";
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  createVideo,
  getVideoStatus,
  downloadVideo,
  getProviderName
};