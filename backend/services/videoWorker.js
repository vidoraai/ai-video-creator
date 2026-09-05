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
      status: "generating"
    });

    const firstScene = job.scenes[0];

    const video = await client.videos.create({
      model: "sora-2",
      prompt: firstScene.prompt,
      seconds: 4,
      size:
        job.aspectRatio === "9:16"
          ? "720x1280"
          : "1280x720"
    });

    updateJob(jobId, {
      status: video.status,
      videoId: video.id,
      completedScenes: 0
    });

    console.log(
      `Video generation started for job ${jobId}: ${video.id}`
    );

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
