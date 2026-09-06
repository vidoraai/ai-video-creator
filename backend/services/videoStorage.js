const fs = require("fs");
const path = require("path");

const storageDir = path.join(
  require("os").tmpdir(),
  "vidora-videos"
);

function ensureStorageDir() {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, {
      recursive: true
    });
  }
}

function getVideoPath(jobId) {
  ensureStorageDir();

  return path.join(
    storageDir,
    `${jobId}.mp4`
  );
}

function videoExists(jobId) {
  return fs.existsSync(
    getVideoPath(jobId)
  );
}

function deleteVideo(jobId) {
  const filePath = getVideoPath(jobId);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  getVideoPath,
  videoExists,
  deleteVideo
};
