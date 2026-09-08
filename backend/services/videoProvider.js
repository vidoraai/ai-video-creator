const OpenAI = require("openai");


// ==========================================
// PROVIDER CONFIGURATION
// ==========================================

const VIDEO_PROVIDER =
  process.env.VIDORA_VIDEO_PROVIDER || "openai";


// ==========================================
// OPENAI CLIENT
// ==========================================

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// ==========================================
// CREATE VIDEO
// ==========================================

async function createVideo({
  prompt,
  seconds,
  size
}) {

  if (VIDEO_PROVIDER !== "openai") {

    throw new Error(
      `Unsupported video provider: ${VIDEO_PROVIDER}`
    );

  }

  const video =
    await client.videos.create({

      model: "sora-2",

      prompt,

      seconds,

      size

    });

  return video;

}


// ==========================================
// GET VIDEO STATUS
// ==========================================

async function getVideoStatus(
  videoId
) {

  if (VIDEO_PROVIDER !== "openai") {

    throw new Error(
      `Unsupported video provider: ${VIDEO_PROVIDER}`
    );

  }

  const video =
    await client.videos.retrieve(
      videoId
    );

  return video;

}


// ==========================================
// DOWNLOAD VIDEO
// ==========================================

async function downloadVideo(
  videoId
) {

  if (VIDEO_PROVIDER !== "openai") {

    throw new Error(
      `Unsupported video provider: ${VIDEO_PROVIDER}`
    );

  }

  const response =
    await client.videos.downloadContent(
      videoId
    );

  const buffer =
    Buffer.from(
      await response.arrayBuffer()
    );

  return buffer;

}


// ==========================================
// PROVIDER INFORMATION
// ==========================================

function getProviderName() {

  return VIDEO_PROVIDER;

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