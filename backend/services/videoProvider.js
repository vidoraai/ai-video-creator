const RunwayML = require("@runwayml/sdk");

const TEST_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function isTestMode() {
  return (
    process.env.VIDORA_VIDEO_PROVIDER ===
    "test"
  );
}

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
// CREATE VIDEO
// ==========================================

async function createVideo({
  prompt,
  seconds,
  size
}) {
  if (isTestMode()) {
    return {
      id: "test-video-" + Date.now(),
      status: "completed",
      prompt,
      seconds,
      size
    };
  }

  const client = getClient();

  let ratio = "1280:720";

  if (size === "720x1280") {
    ratio = "720:1280";
  } else if (size === "720x720") {
    ratio = "1:1";
  }

  const duration = Math.max(
    2,
    Math.min(10, Number(seconds) || 4)
  );

  const task =
    await client.imageToVideo.create({
      model: "gen4.5",
      promptText: prompt.trim(),
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
  if (
    isTestMode() ||
    videoId.startsWith("test-video-")
  ) {
    return {
      id: videoId,
      status: "completed"
    };
  }

  const client = getClient();

  const task =
    await client.tasks.retrieve(videoId);

  if (task.status === "SUCCEEDED") {
    return {
      id: videoId,
      status: "completed",
      output: task.output || []
    };
  }

  if (task.status === "FAILED") {
    throw new Error(
      task.failure ||
      task.failureCode ||
      "Runway video generation failed."
    );
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
// DOWNLOAD VIDEO
// ==========================================

async function downloadVideo(videoId) {
  if (
    isTestMode() ||
    videoId.startsWith("test-video-")
  ) {
    const response =
      await fetch(TEST_VIDEO_URL);

    if (!response.ok) {
      throw new Error(
        "Test video download failed."
      );
    }

    return Buffer.from(
      await response.arrayBuffer()
    );
  }

  const client = getClient();

  const task =
    await client.tasks.retrieve(videoId);

  if (task.status !== "SUCCEEDED") {
    throw new Error(
      "Runway video is not completed yet."
    );
  }

  if (!task.output || !task.output[0]) {
    throw new Error(
      "Runway did not return a video URL."
    );
  }

  const response =
    await fetch(task.output[0]);

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
  return isTestMode()
    ? "test"
    : "runway";
}

module.exports = {
  createVideo,
  getVideoStatus,
  downloadVideo,
  getProviderName
};