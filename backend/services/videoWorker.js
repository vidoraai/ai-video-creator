const {
  getJob,
  updateJob,
  updateScene
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
// WAIT
// ==========================================

function wait(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}


// ==========================================
// WAIT FOR REAL VIDEO
// ==========================================

async function waitForVideo(
  videoId
) {
  while (true) {
    const video =
      await getVideoStatus(
        videoId
      );

    console.log(
      `Video ${videoId} status: ${video.status}`
    );


    // ======================================
    // COMPLETED
    // ======================================

    if (
      video.status ===
      "completed"
    ) {
      return video;
    }


    // ======================================
    // FAILED
    // ======================================

    if (
      video.status ===
      "failed"
    ) {
      throw new Error(
        video.error ||
        "Video generation failed."
      );
    }


    // ======================================
    // CANCELLED
    // ======================================

    if (
      video.status ===
      "cancelled"
    ) {
      throw new Error(
        "Video generation was cancelled."
      );
    }


    // ======================================
    // STILL PROCESSING
    // ======================================

    await wait(5000);
  }
}


// ==========================================
// PROCESS VIDEO JOB
// ==========================================

async function processVideoJob(
  jobId
) {
  const job =
    await getJob(
      jobId
    );


  if (!job) {
    console.error(
      "Job not found:",
      jobId
    );

    return;
  }


  const sceneVideos = [];


  try {

    // ======================================
    // START JOB
    // ======================================

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
      `Starting video job ${jobId}`
    );

    console.log(
      `Total duration: ${job.totalDuration}s`
    );

    console.log(
      `Total scenes: ${job.sceneCount}`
    );


    // ======================================
    // GENERATE EACH REAL SCENE
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

      console.log(
        `Scene duration: ${scene.duration}s`
      );


      // ====================================
      // UPDATE SCENE
      // ====================================

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


      // ====================================
      // SEND SCENE TO REAL PROVIDER
      // ====================================

      const video =
        await createVideo({
          prompt:
            scene.prompt,

          seconds:
            scene.duration,

          size:
            job.aspectRatio ===
            "9:16"
              ? "720x1280"
              : "1280x720"
        });


      if (
        !video ||
        !video.id
      ) {
        throw new Error(
          `Video provider did not return a task ID for scene ${scene.sceneNumber}.`
        );
      }


      console.log(
        `Scene ${scene.sceneNumber} provider task: ${video.id}`
      );


      // ====================================
      // SAVE PROVIDER TASK ID
      // ====================================

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


      // ====================================
      // WAIT FOR REAL VIDEO
      // ====================================

      const completedVideo =
        await waitForVideo(
          video.id
        );


      // ====================================
      // MARK SCENE COMPLETE
      // ====================================

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


      // ====================================
      // ADD TO ASSEMBLY LIST
      // ====================================

      sceneVideos.push({
        sceneNumber:
          scene.sceneNumber,

        videoId:
          completedVideo.id,

        duration:
          scene.duration,

        status:
          "completed"
      });


      // ====================================
      // UPDATE PROGRESS
      // ====================================

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

      console.log(
        `Progress: ${i + 1}/${job.sceneCount}`
      );
    }


    // ======================================
    // BEGIN ASSEMBLY
    // ======================================

    await updateJob(
      jobId,
      {
        status:
          "assembling"
      }
    );


    console.log(
      `All ${sceneVideos.length} scenes generated.`
    );

    console.log(
      "Starting final video assembly..."
    );


    // ======================================
    // FINAL OUTPUT PATH
    // ======================================

    const outputPath =
      getVideoPath(
        jobId
      );


    // ======================================
    // ASSEMBLE REAL VIDEOS
    // ======================================

    await assembleVideos(
      sceneVideos,
      outputPath,
      job.totalDuration
    );


    // ======================================
    // COMPLETE JOB
    // ======================================

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
      `Video job ${jobId} completed successfully.`
    );

  } catch (error) {

    // ======================================
    // LOG ERROR
    // ======================================

    console.error(
      `Video worker error for job ${jobId}:`,
      error
    );


    // ======================================
    // MARK JOB FAILED
    // ======================================

    await updateJob(
      jobId,
      {
        status:
          "failed",

        error:
          error.message ||
          "Video generation failed."
      }
    );


    // ======================================
    // MARK CURRENT SCENE FAILED
    // ======================================

    const failedJob =
      await getJob(
        jobId
      );


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