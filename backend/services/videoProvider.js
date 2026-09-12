const OpenAI = require("openai");

const TEST_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function isTestMode() {
  return (
    process.env.VIDORA_VIDEO_PROVIDER ===
    "test"
  );
}

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI video provider is not configured."
    );
  }

  return new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY
  });
}

async function createVideo({
  prompt,
  seconds,
  size
}) {
  if (isTestMode()) {
    return {
      id:
        "test-video-" +
        Date.now(),
      status:
        "completed",
      prompt,
      seconds,
      size
    };
  }

  const client =
    getClient();

  const video =
    await client.videos.create({
      model: "sora-2",
      prompt,
      seconds,
      size
    });

  return video;
}

async function getVideoStatus(
  videoId
) {
  if (
    isTestMode() ||
    videoId.startsWith(
      "test-video-"
    )
  ) {
    return {
      id: videoId,
      status: "completed"
    };
  }

  const client =
    getClient();

  const video =
    await client.videos.retrieve(
      videoId
    );

  return video;
}

async function downloadVideo(
  videoId
) {
  if (
    isTestMode() ||
    videoId.startsWith(
      "test-video-"
    )
  ) {
    const response =
      await fetch(
        TEST_VIDEO_URL
      );

    if (!response.ok) {
      throw new Error(
        "Test video download failed."
      );
    }

    return Buffer.from(
      await response.arrayBuffer()
    );
  }

  const client =
    getClient();

  const response =
    await client.videos.downloadContent(
      videoId
    );

  return Buffer.from(
    await response.arrayBuffer()
  );
}

function getProviderName() {
  return isTestMode()
    ? "test"
    : "openai";
}

module.exports = {
  createVideo,
  getVideoStatus,
  downloadVideo,
  getProviderName
};