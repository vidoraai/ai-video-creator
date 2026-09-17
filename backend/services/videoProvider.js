const RunwayML = require("@runwayml/sdk");

function getClient() {
  if (!process.env.RUNWAY_API_KEY) {
    throw new Error(
      "Runway video provider is not configured."
    );
  }

  return new RunwayML({
    apiKey: process.env.RUNWAY_API_KEY
  });
}


// ==========================================
// CREATE REAL AI VIDEO
// ==========================================

async function createVideo({
  prompt,
  seconds,
  size
}) {
  const client = getClient();

  let ratio = "1280:720";

  if (size === "720x1280") {
    ratio = "720:1280";
  }

  // Gen-4.5 supports 2–10 seconds.
  const requestedSeconds =
    Number(seconds);

  const duration =
    Math.max(
      2,
      Math.min(
        10,
        requestedSeconds
      )
    );

  const task =
    await client.imageToVideo.create({
      model: "gen4.5",
      promptText:
        prompt.trim(),
      ratio,
      duration
    });

  return {
    id: task.id,
    status: "processing"
  };
}


// ==========================================
// GET VIDEO STATUS
// ==========================================

async function getVideoStatus(videoId) {
  const client = getClient();

  const task =
    await client.tasks.retrieve(
      videoId
    );

  if (task.status === "SUCCEEDED") {
    return {
      id: videoId,
      status: "completed",
      output: task.output || []
    };
  }

  if (task.status === "FAILED") {
    return {
      id: videoId,
      status: "failed",
      error:
        task.failure ||
        task.failureCode ||
        "Runway video generation failed."
    };
  }

  if (
    task.status === "CANCELED" ||
    task.status === "CANCELLED"
  ) {
    return {
      id: videoId,
      status: "cancelled"
    };
  }

  return {
    id: videoId,
    status: "processing"
  };
}


// ==========================================
// DOWNLOAD GENERATED VIDEO
// ==========================================

async function downloadVideo(videoId) {
  const client = getClient();

  const task =
    await client.tasks.retrieve(
      videoId
    );

  if (task.status !== "SUCCEEDED") {
    throw new Error(
      "Runway video is not completed yet."
    );
  }

  if (
    !task.output ||
    !task.output[0]
  ) {
    throw new Error(
      "Runway did not return a video URL."
    );
  }

  const videoUrl =
    task.output[0];

  const response =
    await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(
      `Unable to download Runway video: ${response.status}`
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}


// ==========================================
// PROVIDER NAME
// ==========================================

function getProviderName() {
  return "runway";
}


module.exports = {
  createVideo,
  getVideoStatus,
  downloadVideo,
  getProviderName
};
