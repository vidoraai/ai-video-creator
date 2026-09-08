const jobs = new Map();


// ==========================================
// CREATE JOB
// ==========================================

function createJob(data) {

  const jobId =
    `job_${Date.now()}`;

  const job = {

    id: jobId,

    status:
      "planning",

    prompt:
      data.prompt,

    totalDuration:
      data.totalDuration,

    sceneDuration:
      data.sceneDuration,

    sceneCount:
      data.sceneCount,

    aspectRatio:
      data.aspectRatio ||
      "16:9",

    style:
      data.style ||
      "cinematic",

    provider:
      data.provider ||
      process.env.VIDORA_VIDEO_PROVIDER ||
      "openai",

    scenes:
      data.scenes ||
      [],

    completedScenes:
      0,

    sceneVideos:
      [],

    createdAt:
      new Date().toISOString()

  };


  jobs.set(
    jobId,
    job
  );


  return job;

}


// ==========================================
// GET JOB
// ==========================================

function getJob(jobId) {

  return jobs.get(
    jobId
  );

}


// ==========================================
// UPDATE JOB
// ==========================================

function updateJob(
  jobId,
  updates
) {

  const job =
    jobs.get(
      jobId
    );


  if (!job) {

    return null;

  }


  Object.assign(
    job,
    updates
  );


  return job;

}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

  createJob,

  getJob,

  updateJob

};