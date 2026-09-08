const OpenAI = require("openai");

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI video provider is not configured."
    );
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

async function createVideo({
  prompt,
  seconds,
  size
}) {
  const client = getClient();

  const video = await client.videos.create({
    model: "sora-2",
    prompt,
    seconds,
    size
  });

  return video;
}

async function getVideoStatus(videoId) {
  const client = getClient();

  const video = await client.videos.retrieve(videoId);

  return video;
}

async function downloadVideo(videoId) {
  const client = getClient();

  const response =
    await client.videos.downloadContent(videoId);

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  return buffer;
}

function getProviderName() {
  return "openai";
}

module.exports = {
  createVideo,
  getVideoStatus,
  downloadVideo,
  getProviderName
};