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

    const sceneFiles = [];


    // ======================================
    // DOWNLOAD ALL SCENES
    // ======================================

    for (
      let i = 0;
      i < sceneVideos.length;
      i++
    ) {

      const scene =
        sceneVideos[i];


      const scenePath =
        path.join(
          tempDir,
          `scene-${i + 1}.mp4`
        );


      await downloadScene(
        scene.videoId,
        scenePath
      );


      sceneFiles.push(
        scenePath
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
      sceneFiles
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
    // JOIN VIDEOS
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