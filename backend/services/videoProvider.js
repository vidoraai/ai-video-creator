const {
  getVideoProvider
} = require("./videoProviders");

function getProvider() {
  return getVideoProvider();
}

async function createVideo(data) {
  const provider = getProvider();
  return provider.createVideo(data);
}

async function getVideoStatus(videoId) {
  const provider = getProvider();
  return provider.getVideoStatus(videoId);
}

async function downloadVideo(videoId) {
  const provider = getProvider();
  return provider.downloadVideo(videoId);
}

function getProviderName() {
  const provider = getProvider();
  return provider.getProviderName();
}

module.exports = {
  createVideo,
  getVideoStatus,
  downloadVideo,
  getProviderName
};