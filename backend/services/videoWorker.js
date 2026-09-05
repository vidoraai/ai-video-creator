const OpenAI = require("openai");

const {
  getJob,
  updateJob
} = require("./videoJobService");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

    // Process scenes one at a time.
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
        lastVideoId: video.id,
        completedScenes: i + 1
      });

      console.log(
        `Scene ${scene.sceneNumber} started: ${video.id}`
      );

      // Stop here for now.
      // We will add video completion checking
      // and final video assembly next.
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
