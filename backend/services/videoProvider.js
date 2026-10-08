const API_URL = "https://api.dev.runwayml.com/v1";

const RUNWAY_MODEL =
  process.env.RUNWAY_MODEL || "gen4.5";

const RUNWAY_API_SECRET =
  process.env.RUNWAYML_API_SECRET ||
  process.env.RUNWAY_API_KEY;

if (!RUNWAY_API_SECRET) {
  console.warn(
    "Runway API credentials are not configured."
  );
}

function clampDuration(duration) {
  const value = Number(duration);

  if (!Number.isFinite(value)) {
    return 5;
  }

  return Math.min(
    10,
    Math.max(2, Math.round(value))
  );
}

function getRunwayRatio(aspectRatio) {
  if (aspectRatio === "9:16") {
    return "720:1280";
  }

  return "1280:720";
}

async function runwayRequest(path, options = {}) {
  if (!RUNWAY_API_SECRET) {
    throw new Error(
      "Runway API credentials are not configured."
    );
  }

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${RUNWAY_API_SECRET}`,
        "X-Runway-Version": "2024-11-06",
        ...(options.headers || {})
      }
    }
  );

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      error: text
    };
  }

  if (!response.ok) {
    throw new Error(
      `Runway API error ${response.status}: ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function createVideo({
  prompt,
  duration,
  aspectRatio = "16:9"
}) {
  if (!RUNWAY_API_SECRET) {
    throw new Error(
      "Runway API credentials are not configured."
    );
  }

  if (!prompt || !String(prompt).trim()) {
    throw new Error(
      "A video prompt is required."
    );
  }

  const videoDuration =
    clampDuration(duration);

  const ratio =
    getRunwayRatio(aspectRatio);

  console.log(
    "Starting Runway Gen-4.5 text-to-video generation..."
  );

  console.log(
    `Model: ${RUNWAY_MODEL}`
  );

  console.log(
    `Duration: ${videoDuration}s`
  );

  console.log(
    `Ratio: ${ratio}`
  );

  const payload = {
    model: RUNWAY_MODEL,
    promptText: String(prompt).trim(),
    ratio,
    duration: videoDuration
  };

  console.log(
    "Sending request to Runway text-to-video endpoint..."
  );

  const task =
    await runwayRequest(
      "/text_to_video",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

  console.log(
    `Runway task created: ${task.id}`
  );

  return {
    id: task.id,
    status: "queued"
  };
}

async function getVideoStatus(videoId) {
  if (!videoId) {
    throw new Error(
      "Runway video ID is required."
    );
  }

  const task =
    await runwayRequest(
      `/tasks/${encodeURIComponent(videoId)}`,
      {
        method: "GET"
      }
    );

  return {
    id: task.id,
    status: String(
      task.status || ""
    ).toLowerCase(),
    output: task.output || null,
    failure:
      task.failure ||
      task.failureCode ||
      null
  };
}

async function downloadVideo(videoId) {
  if (!videoId) {
    throw new Error(
      "Runway video ID is required."
    );
  }

  const task =
    await runwayRequest(
      `/tasks/${encodeURIComponent(videoId)}`,
      {
        method: "GET"
      }
    );

  if (
    !task.output ||
    !Array.isArray(task.output) ||
    !task.output[0]
  ) {
    throw new Error(
      "Runway video output is not available."
    );
  }

  const videoUrl =
    task.output[0];

  console.log(
    "Downloading generated Runway video..."
  );

  const response =
    await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download Runway video: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

module.exports = {
  createVideo,
  getVideoStatus,
  downloadVideo
};