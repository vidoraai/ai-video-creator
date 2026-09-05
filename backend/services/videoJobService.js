const jobs = new Map();

function createJob(data) {
  const jobId = `job_${Date.now()}`;

  const job = {
    id: jobId,
    status: "planning",
    prompt: data.prompt,
    totalDuration: data.totalDuration,
    sceneDuration: data.sceneDuration,
    sceneCount: data.sceneCount,
    scenes: data.scenes || [],
    completedScenes: 0,
    sceneVideos: [],
    createdAt: new Date().toISOString()
  };

  jobs.set(jobId, job);

  return job;
}

function getJob(jobId) {
  return jobs.get(jobId);
}

function updateJob(jobId, updates) {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  Object.assign(job, updates);

  return job;
}

module.exports = {
  createJob,
  getJob,
  updateJob
};
