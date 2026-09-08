const {
  getJob,
  updateJob
} = require("./videoJobService");

const {
  createVideo,
  getVideoStatus
} = require("./videoProvider");

const {
  assembleVideos
} = require("./videoAssembler");

const {
  getVideoPath
} = require("./videoStorage");


// ==========================================
// WAIT FOR VIDEO
// ==========================================

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


async function waitForVideo(videoId) {

  while (true) {

    const video =
      await getVideoStatus(videoId);

    console.log(
      `Video ${videoId} status: ${video.status}`
    );


    if (
      video.status === "completed"
    ) {

      return video;

    }


    if (
      video.status === "failed" ||
      video.status === "cancelled"
    ) {

      throw new Error(
        `Video generation ${video.status}`
      );

    }


    await wait(5000);

  }
}


// ==========================================
// PROCESS VIDEO JOB
// ==========================================

async function processVideoJob(jobId) {

  const job =
    getJob(jobId);


  if (!job) {

    console.error(
      "Job not found:",
      jobId
    );

    return;

  }


  const sceneVideos = [];


  try {

    updateJob(jobId, {

      status: "generating",

      completedScenes: 0,

      sceneVideos: []

    });


    console.log(
      `Starting video job ${jobId} with ${job.sceneCount} scenes`
    );


    // ======================================
    // GENERATE EACH SCENE
    // ======================================

    for (
      let i = 0;
      i < job.scenes.length;
      i++
    ) {

      const scene =
        job.scenes[i];


      console.log(
        `Generating scene ${scene.sceneNumber} of ${job.sceneCount}`
      );


      const video =
        await createVideo({

          prompt:
            scene.prompt,

          seconds:
            scene.duration,

          size:
            job.aspectRatio === "9:16"
              ? "720x1280"
              : job.aspectRatio === "1:1"
                ? "720x720"
                : "1280x720"

        });


      updateJob(jobId, {

        status:
          "generating",

        currentScene:
          scene.sceneNumber,

        lastVideoId:
          video.id

      });


      const completedVideo =
        await waitForVideo(
          video.id
        );


      sceneVideos.push({

        sceneNumber:
          scene.sceneNumber,

        videoId:
          completedVideo.id,

        status:
          "completed"

      });


      updateJob(jobId, {

        completedScenes:
          i + 1,

        lastVideoId:
          completedVideo.id,

        sceneVideos:
          sceneVideos

      });


      console.log(
        `Scene ${scene.sceneNumber} completed`
      );

    }


    // ======================================
    // ASSEMBLE FINAL VIDEO
    // ======================================

    updateJob(jobId, {

      status:
        "assembling"

    });


    console.log(
      `Assembling ${sceneVideos.length} scenes`
    );


    const outputPath =
      getVideoPath(jobId);


    await assembleVideos(

      sceneVideos,

      outputPath

    );


    // ======================================
    // JOB COMPLETE
    // ======================================

    updateJob(jobId, {

      status:
        "completed",

      finalVideoPath:
        outputPath

    });


    console.log(
      `Video job ${jobId} completed`
    );


  } catch (error) {

    console.error(
      "Video worker error:",
      error
    );


    updateJob(jobId, {

      status:
        "failed",

      error:
        error.message

    });

  }

}


// ==========================================
// EXPORT
// ==========================================

module.exports = {

  processVideoJob

};