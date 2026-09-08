const {
  getVideoProvider
} = require("./videoProviders");


// ==========================================
// GET ACTIVE VIDEO PROVIDER
// ==========================================

function getProvider() {

  return getVideoProvider();

}


// ==========================================
// CREATE VIDEO
// ==========================================

async function createVideo(data) {

  const provider =
    getProvider();

  return provider.createVideo(
    data
  );

}


// ==========================================
// GET VIDEO STATUS
// ==========================================

async function getVideoStatus(
  videoId
) {

  const provider =
    getProvider();

  return provider.getVideoStatus(
    videoId
  );

}


// ==========================================
// DOWNLOAD VIDEO
// ==========================================

async function downloadVideo(
  videoId
) {

  const provider =
    getProvider();

  return provider.downloadVideo(
    videoId
  );

}


// ==========================================
// PROVIDER NAME
// ==========================================

function getProviderName() {

  const provider =
    getProvider();

  return provider.getProviderName();

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