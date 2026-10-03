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
  return new Promise(
    (resolve, reject) => {
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
    }
  );
}


// ==========================================
// GET VIDEO DIMENSIONS
// ==========================================

function getVideoDimensions(
  aspectRatio
) {
  switch (
    aspectRatio
  ) {
    case "9:16":
      return {
        width: 720,
        height: 1280
      };

    case "1:1":
      return {
        width: 720,
        height: 720
      };

    case "16:9":
    default:
      return {
        width: 1280,
        height: 720
      };
  }
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
  duration,
  width,
  height
) {
  const videoFilter =
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

  await runFFmpeg([
    "-y",

    "-i",
    inputPath,

    "-t",
    String(duration),

    "-an",

    "-vf",
    videoFilter,

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
  outputPath,
  targetDuration,
  aspectRatio = "16:9"
) {
  if (
    !Array.isArray(
      sceneVideos
    ) ||
    sceneVideos.length === 0
  ) {
    throw new Error(
      "No scene videos were provided for assembly."
    );
  }


  const requestedDuration =
    Number(targetDuration);


  if (
    !Number.isFinite(
      requestedDuration
    ) ||
    requestedDuration <= 0
  ) {
    throw new Error(
      "A valid target video duration is required."
    );
  }


  const {
    width,
    height
  } =
    getVideoDimensions(
      aspectRatio
    );


  console.log(
    `Assembly aspect ratio: ${aspectRatio}`
  );

  console.log(
    `Assembly resolution: ${width}x${height}`
  );


  const tempDir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "vidora-"
      )
    );


  try {

    // ======================================
    // PREPARE SCENES
    // ======================================

    const preparedFiles = [];


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
          scene.duration
        );


      if (
        !Number.isFinite(
          duration
        ) ||
        duration <= 0
      ) {
        throw new Error(
          `Invalid duration for scene ${i + 1}.`
        );
      }


      console.log(
        `Downloading scene ${i + 1}/${sceneVideos.length}`
      );


      await downloadScene(
        scene.videoId,
        originalPath
      );


      console.log(
        `Preparing scene ${i + 1}/${sceneVideos.length}`
      );


      await prepareScene(
        originalPath,
        preparedPath,
        duration,
        width,
        height
      );


      preparedFiles.push(
        preparedPath
      );
    }


    // ======================================
    // CREATE FFMPEG CONCAT LIST
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
    // CREATE CONCATENATED VIDEO
    // ======================================

    const concatenatedPath =
      path.join(
        tempDir,
        "concatenated.mp4"
      );


    console.log(
      "Joining generated scenes..."
    );


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

      concatenatedPath
    ]);


    // ======================================
    // EXACT FINAL DURATION
    // ======================================

    console.log(
      `Finalizing video at ${requestedDuration} seconds...`
    );


    const finalVideoFilter =
      `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;


    await runFFmpeg([
      "-y",

      "-i",
      concatenatedPath,

      "-t",
      String(
        requestedDuration
      ),

      "-an",

      "-vf",
      finalVideoFilter,

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


    // ======================================
    // VERIFY OUTPUT EXISTS
    // ======================================

    if (
      !fs.existsSync(
        outputPath
      )
    ) {
      throw new Error(
        "FFmpeg did not create the final video."
      );
    }


    const outputStats =
      fs.statSync(
        outputPath
      );


    if (
      outputStats.size <= 0
    ) {
      throw new Error(
        "Final video file is empty."
      );
    }


    console.log(
      `Final Vidora video created: ${outputPath}`
    );

    console.log(
      `Final video size: ${outputStats.size} bytes`
    );


    return outputPath;

  } finally {

    // ======================================
    // CLEAN TEMP FILES
    // ======================================

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