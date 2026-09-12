const {
  getJob,
  updateJob,
  updateScene
} = require("./videoJobService");

const {
  createVideo,
  getVideoStatus,
  getProviderName
} = require("./videoProvider");

const {
  assembleVideos
} = require("./videoAssembler");

const {
  getVideoPath
} = require("./videoStorage");


// ==========================================
// WAIT
// ==========================================

function wait(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}


// ==========================================
// WAIT FOR VIDEO
// ==========================================

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
    await getJob(jobId);


  if (!job) {

    console.error(
      "Job not found:",
      jobId
    );

    return;
  }


  const sceneVideos = [];


  try {

    // --------------------------------------
    // Start generation
    // --------------------------------------

    await updateJob(
      jobId,
      {
        status:
          "generating",

        completedScenes:
          0,

        currentScene:
          1
      }
    );


    console.log(
      `Starting video job ${jobId} with ${job.sceneCount} scenes`
    );


    // --------------------------------------
    // Generate each scene
    // --------------------------------------

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


      // Mark scene as generating
      await updateScene(
        jobId,
        scene.sceneNumber,
        {
          status:
            "generating"
        }
      );


      await updateJob(
        jobId,
        {
          status:
            "generating",

          currentScene:
            scene.sceneNumber
        }
      );


      // ------------------------------------
      // Create video
      // ------------------------------------

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


      // Save provider video ID
      await updateScene(
        jobId,
        scene.sceneNumber,
        {
          status:
            "processing",

          videoId:
            video.id
        }
      );


      // ------------------------------------
      // Wait for completion
      // ------------------------------------

      const completedVideo =
        await waitForVideo(
          video.id
        );


      // ------------------------------------
      // Mark scene completed
      // ------------------------------------

      await updateScene(
        jobId,
        scene.sceneNumber,
        {
          status:
            "completed",

          videoId:
            completedVideo.id
        }
      );


      sceneVideos.push({

        sceneNumber:
          scene.sceneNumber,

        videoId:
          completedVideo.id,

        status:
          "completed"
      });


      // ------------------------------------
      // Update job progress
      // ------------------------------------

      await updateJob(
        jobId,
        {
          completedScenes:
            i + 1
        }
      );


      console.log(
        `Scene ${scene.sceneNumber} completed`
      );
    }


    // --------------------------------------
    // Assemble final video
    // --------------------------------------

    await updateJob(
      jobId,
      {
        status:
          "assembling"
      }
    );


    console.log(
      `Assembling ${sceneVideos.length} scenes`
    );


    const outputPath =
      getVideoPath(jobId);


    await assembleVideos(
      sceneVideos,
      outputPath
    );


    // --------------------------------------
    // Complete job
    // --------------------------------------

    await updateJob(
      jobId,
      {
        status:
          "completed",

        finalVideoPath:
          outputPath
      }
    );


    console.log(
      `Video job ${jobId} completed`
    );


  } catch (error) {

    console.error(
      "Video worker error:",
      error
    );


    await updateJob(
      jobId,
      {
        status:
          "failed",

        error:
          error.message
      }
    );


    // Try to mark the current scene failed
    const failedJob =
      await getJob(jobId);


    if (
      failedJob &&
      failedJob.currentScene
    ) {

      await updateScene(
        jobId,
        failedJob.currentScene,
        {
          status:
            "failed"
        }
      );
    }
  }
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  processVideoJob
};