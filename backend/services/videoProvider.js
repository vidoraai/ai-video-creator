const OpenAI = require("openai");

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

  const video = await client.videos.create({

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

  return "openai";
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