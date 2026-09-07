const history = new Map();

function addVideoToHistory(job) {
  const item = {
    id: job.id,
    prompt: job.prompt,
    status: job.status,
    duration: job.totalDuration,
    sceneCount: job.sceneCount,
    aspectRatio: job.aspectRatio,
    style: job.style,
    finalVideoPath: job.finalVideoPath || null,
    createdAt: job.createdAt,
    updatedAt: new Date().toISOString()
  };

  history.set(job.id, item);

  return item;
}

function updateVideoHistory(job) {
  const existing = history.get(job.id);

  if (!existing) {
    return addVideoToHistory(job);
  }

  Object.assign(existing, {
    status: job.status,
    finalVideoPath:
      job.finalVideoPath || existing.finalVideoPath,
    updatedAt: new Date().toISOString()
  });

  return existing;
}

function getVideoHistory() {
  return Array.from(history.values())
    .sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );
}

function getHistoryItem(id) {
  return history.get(id);
}

module.exports = {
  addVideoToHistory,
  updateVideoHistory,
  getVideoHistory,
  getHistoryItem
};