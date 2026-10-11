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
  getVideoPath,
  uploadVideo
} = require("./videoStorage");

const POLL_INTERVAL_MS = 5000;
const VIDEO_TIMEOUT_MS = 15 * 60 * 1000;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForVideo(videoId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < VIDEO_TIMEOUT_MS) {
    const video = await getVideoStatus(videoId);

    console.log(
      `Runway task ${videoId} status: ${video.status}`
    );

    if (video.status === "completed") {
      return video;
    }

    if (
      video.status === "failed" ||
      video.status === "cancelled"
    ) {
      throw new Error(
        video.failure ||
        `Runway task ${videoId} ${video.status}.`
      );
    }

    await wait(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Runway task ${videoId} timed out after 15 minutes.`
  );
}

async function processVideoJob(jobId) {
  const job = await getJob(jobId);

  if (!job) {
    console.error("Job not found:", jobId);
    return;
  }

  const sceneVideos = [];
  let currentSceneNumber = null;

  try {
    if (!Array.isArray(job.scenes) || job.scenes.length === 0) {
      throw new Error("This video job has no scenes to generate.");
    }

    await updateJob(jobId, {
      status: "generating",
      completedScenes: 0,
      currentScene: 1
    });

    console.log(`Starting video job ${jobId}`);
    console.log(`Total duration: ${job.totalDuration}s`);
    console.log(`Total scenes: ${job.sceneCount}`);
    console.log(`Aspect ratio: ${job.aspectRatio}`);

    for (let i = 0; i < job.scenes.length; i++) {
      const scene = job.scenes[i];
      currentSceneNumber = scene.sceneNumber;

      console.log(
        `Generating scene ${scene.sceneNumber} of ${job.scenes.length}`
      );

      await updateScene(jobId, scene.sceneNumber, {
        status: "generating"
      });

      await updateJob(jobId, {
        status: "generating",
        currentScene: scene.sceneNumber
      });

      const video = await createVideo({
        prompt: scene.prompt,
        duration: scene.duration,
        aspectRatio: job.aspectRatio
      });

      if (!video || !video.id) {
        throw new Error(
          `Runway did not return a task ID for scene ${scene.sceneNumber}.`
        );
      }

      await updateScene(jobId, scene.sceneNumber, {
        status: "processing",
        videoId: video.id
      });

      const completedVideo = await waitForVideo(video.id);

      sceneVideos.push({
        sceneNumber: scene.sceneNumber,
        videoId: completedVideo.id,
        duration: scene.duration,
        status: "completed"
      });

      await updateScene(jobId, scene.sceneNumber, {
        status: "completed",
        videoId: completedVideo.id
      });

      await updateJob(jobId, {
        completedScenes: i + 1
      });

      console.log(
        `Scene ${scene.sceneNumber} completed (${i + 1}/${job.scenes.length}).`
      );
    }

    await updateJob(jobId, {
      status: "assembling"
    });

    const outputPath = getVideoPath(jobId);

    console.log("Assembling generated scenes...");

    await assembleVideos(
      sceneVideos,
      outputPath,
      job.totalDuration,
      job.aspectRatio
    );

    await updateJob(jobId, {
      status: "uploading"
    });

    console.log("Uploading final video to storage...");

    const storageKey = await uploadVideo(jobId, outputPath);

    if (!storageKey) {
      throw new Error("Video storage did not return a file key.");
    }

    await updateJob(jobId, {
      status: "completed",
      finalVideoPath: storageKey,
      error: null
    });

    console.log(`Video job ${jobId} completed successfully.`);
  } catch (error) {
    console.error(`Video worker error for job ${jobId}:`, error);

    try {
      await updateJob(jobId, {
        status: "failed",
        error: error.message || "Video generation failed."
      });

      if (currentSceneNumber !== null) {
        await updateScene(jobId, currentSceneNumber, {
          status: "failed"
        });
      }
    } catch (updateError) {
      console.error(
        `Could not save failure status for job ${jobId}:`,
        updateError
      );
    }
  }
}

module.exports = {
  processVideoJob
};