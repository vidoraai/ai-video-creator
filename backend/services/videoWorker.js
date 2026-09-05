const OpenAI = require("openai");

const {
  getJob,
  updateJob
} = require("./videoJobService");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForVideo(videoId) {
  while (true) {
    const video = await client.videos.retrieve(videoId);

    console.log(
      `Video ${videoId} status: ${video.status}`
    );

    if (video.status === "completed") {
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

async function processVideoJob(jobId) {
  const job = getJob(jobId);

  if (!job) {
    console.error("Job not found:", jobId);
    return;
  }

  try {
    updateJob(jobId, {
      status: "generating",
      completedScenes: 0
    });

    console.log(
      `Starting video job ${jobId} with ${job.sceneCount} scenes`
    );

    for (let i = 0; i < job.scenes.length; i++) {
      const scene = job.scenes[i];

      console.log(
        `Generating scene ${scene.sceneNumber} of ${job.sceneCount}`
      );

      const video = await client.videos.create({
        model: "sora-2",
        prompt: scene.prompt,
        seconds: 4,
        size:
          job.aspectRatio === "9:16"
            ? "720x1280"
            : "1280x720"
      });

      updateJob(jobId, {
        status: "generating",
        currentScene: scene.sceneNumber,
        lastVideoId: video.id
      });

      const completedVideo = await waitForVideo(video.id);

      updateJob(jobId, {
  completedScenes: i + 1,
  lastVideoId: completedVideo.id,
  sceneVideos: [
    ...job.sceneVideos,
    {
      sceneNumber: scene.sceneNumber,
      videoId: completedVideo.id,
      status: "completed"
    }
  ]
});

      console.log(
        `Scene ${scene.sceneNumber} completed`
      );

      // We will add scene storage and video assembly next.
      break;
    }

  } catch (error) {
    console.error("Video worker error:", error);

    updateJob(jobId, {
      status: "failed",
      error: error.message
    });
  }
}

module.exports = {
  processVideoJob
};
