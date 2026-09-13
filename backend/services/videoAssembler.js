const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const {
  downloadVideo
} = require("./videoProvider");


// ==========================================
// RUN FFMPEG
// ==========================================

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      args,
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr ||
              error.message
            )
          );

          return;
        }

        resolve(stdout);
      }
    );
  });
}


// ==========================================
// DOWNLOAD SCENE
// ==========================================

async function downloadScene(
  videoId,
  outputPath
) {
  const buffer =
    await downloadVideo(
      videoId
    );

  fs.writeFileSync(
    outputPath,
    buffer
  );
}


// ==========================================
// PREPARE SCENE
// ==========================================

async function prepareScene(
  inputPath,
  outputPath,
  duration
) {
  await runFFmpeg([
    "-y",

    "-i",
    inputPath,

    "-t",
    String(duration),

    "-an",

    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p",

    "-r",
    "30",

    "-c:v",
    "libx264",

    "-preset",
    "veryfast",

    "-crf",
    "23",

    "-movflags",
    "+faststart",

    outputPath
  ]);
}


// ==========================================
// ASSEMBLE VIDEOS
// ==========================================

async function assembleVideos(
  sceneVideos,
  outputPath
) {
  const tempDir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "vidora-"
      )
    );

  try {
    const preparedFiles = [];

    // ======================================
    // DOWNLOAD AND PREPARE ALL SCENES
    // ======================================

    for (
      let i = 0;
      i < sceneVideos.length;
      i++
    ) {
      const scene =
        sceneVideos[i];

      const originalPath =
        path.join(
          tempDir,
          `original-${i + 1}.mp4`
        );

      const preparedPath =
        path.join(
          tempDir,
          `scene-${i + 1}.mp4`
        );

      const duration =
        Number(
          scene.duration || 4
        );

      await downloadScene(
        scene.videoId,
        originalPath
      );

      await prepareScene(
        originalPath,
        preparedPath,
        duration
      );

      preparedFiles.push(
        preparedPath
      );
    }


    // ======================================
    // CREATE FFMPEG LIST
    // ======================================

    const listPath =
      path.join(
        tempDir,
        "videos.txt"
      );

    const listContent =
      preparedFiles
        .map(
          (file) =>
            `file '${file.replace(
              /'/g,
              "'\\''"
            )}'`
        )
        .join("\n");

    fs.writeFileSync(
      listPath,
      listContent
    );


    // ======================================
    // JOIN PREPARED SCENES
    // ======================================

    await runFFmpeg([
      "-y",

      "-f",
      "concat",

      "-safe",
      "0",

      "-i",
      listPath,

      "-c",
      "copy",

      "-movflags",
      "+faststart",

      outputPath
    ]);


    return outputPath;

  } finally {
    fs.rmSync(
      tempDir,
      {
        recursive: true,
        force: true
      }
    );
  }
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  assembleVideos
};