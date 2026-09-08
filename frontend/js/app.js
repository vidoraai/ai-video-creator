const API_BASE =
  "https://vidora-ai-99yg.onrender.com";

const button =
  document.getElementById("createVideo");

const prompt =
  document.getElementById("prompt");

const status =
  document.getElementById("status");

const duration =
  document.getElementById("duration");

const aspectRatio =
  document.getElementById("aspectRatio");

const style =
  document.getElementById("style");

const videoContainer =
  document.getElementById("videoContainer");


// ==========================================
// CREATE VIDEO
// ==========================================

button.addEventListener(
  "click",
  async () => {

    const videoPrompt =
      prompt.value.trim();

    if (!videoPrompt) {

      status.textContent =
        "Please describe the video you want to create.";

      return;
    }

    button.disabled = true;

    videoContainer.innerHTML = "";

    status.textContent =
      "Creating your video job...";

    try {

      const response =
        await fetch(
          `${API_BASE}/api/videos/generate`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              prompt:
                videoPrompt,

              duration:
                duration.value,

              aspectRatio:
                aspectRatio.value,

              style:
                style.value
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to create video job."
        );
      }

      const jobId =
        data.jobId;

      if (!jobId) {

        throw new Error(
          "No job ID was returned."
        );
      }

      status.textContent =
        "Video job created. Preparing your video...";

      let finished = false;

      while (!finished) {

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              3000
            )
        );

        const jobResponse =
          await fetch(
            `${API_BASE}/api/videos/job/${jobId}`
          );

        const jobData =
          await jobResponse.json();

        if (!jobResponse.ok) {

          throw new Error(
            jobData.message ||
            "Unable to check video job."
          );
        }

        const job =
          jobData.job;


        if (
          job.status === "queued"
        ) {

          status.textContent =
            "Your video is queued...";
        }


        else if (
          job.status === "generating"
        ) {

          const completed =
            job.completedScenes || 0;

          const total =
            job.sceneCount || 0;

          status.textContent =
            `Generating video... Scene ${completed} of ${total}`;
        }


        else if (
          job.status === "assembling"
        ) {

          status.textContent =
            "Assembling your finished video...";
        }


        else if (
          job.status === "completed"
        ) {

          finished = true;

          status.textContent =
            "Your video is ready!";

          displayFinishedVideo(
            jobId,
            jobData.videoUrl,
            jobData.downloadUrl
          );

          loadVideoHistory();
        }


        else if (
          job.status === "failed"
        ) {

          finished = true;

          status.textContent =
            "Video generation failed: " +
            (
              job.error ||
              "Unknown error."
            );
        }


        else if (
          job.status === "cancelled"
        ) {

          finished = true;

          status.textContent =
            "Video generation was cancelled.";
        }
      }

    } catch (error) {

      console.error(
        "Vidora AI error:",
        error
      );

      status.textContent =
        "Unable to create video: " +
        error.message;

    } finally {

      button.disabled = false;
    }
  }
);


// ==========================================
// DISPLAY FINISHED VIDEO
// ==========================================

function displayFinishedVideo(
  jobId,
  videoUrl,
  downloadUrl
) {

  const fullVideoUrl =
    videoUrl
      ? `${API_BASE}${videoUrl}`
      : `${API_BASE}/api/videos/job/${jobId}/video`;

  const fullDownloadUrl =
    downloadUrl
      ? `${API_BASE}${downloadUrl}`
      : `${API_BASE}/api/videos/job/${jobId}/download`;

  videoContainer.innerHTML = `

    <div class="result-card">

      <h2>
        Your Video Is Ready 🎬
      </h2>

      <video
        class="result-video"
        controls
        playsinline
        preload="metadata"
      >

        <source
          src="${fullVideoUrl}"
          type="video/mp4"
        />

        Your browser does not support
        HTML5 video.

      </video>

      <div class="result-actions">

        <a
          class="download-button"
          href="${fullDownloadUrl}"
          download
        >
          Download Video
        </a>

      </div>

    </div>

  `;
}


// ==========================================
// LOAD VIDEO HISTORY
// ==========================================

async function loadVideoHistory() {

  try {

    const response =
      await fetch(
        `${API_BASE}/api/videos/history`
      );

    const data =
      await response.json();

    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to load video history."
      );
    }

    displayVideoHistory(
      data.history || []
    );

  } catch (error) {

    console.error(
      "History error:",
      error
    );
  }
}


// ==========================================
// DISPLAY VIDEO HISTORY
// ==========================================

function displayVideoHistory(
  history
) {

  const existing =
    document.getElementById(
      "videoHistory"
    );

  if (!existing) {
    return;
  }


  if (history.length === 0) {

    existing.innerHTML = `
      <div class="history-empty">
        <h3>No videos yet</h3>
        <p>
          Your generated videos will
          appear here.
        </p>
      </div>
    `;

    return;
  }


  existing.innerHTML = `

    <div class="history-header">

      <h2>
        Your Video History
      </h2>

      <span>
        ${history.length} video${history.length === 1 ? "" : "s"}
      </span>

    </div>

    <div class="history-list">

      ${history.map(
        (video) => {

          const date =
            new Date(
              video.createdAt
            ).toLocaleString();

          const videoUrl =
            video.status === "completed"
              ? `${API_BASE}/api/videos/job/${video.id}/video`
              : null;

          const downloadUrl =
            video.status === "completed"
              ? `${API_BASE}/api/videos/job/${video.id}/download`
              : null;


          return `

            <div class="history-item">

              <div class="history-info">

                <h3>
                  ${escapeHtml(
                    video.prompt
                  )}
                </h3>

                <p>
                  ${video.duration || 0}
                  seconds •
                  ${video.style || "cinematic"}
                </p>

                <small>
                  ${date}
                </small>

              </div>


              <div class="history-status">

                <strong>
                  ${video.status}
                </strong>

              </div>


              ${
                video.status === "completed"
                  ? `

                    <div class="history-actions">

                      <button
                        type="button"
                        onclick="playHistoryVideo('${videoUrl}')"
                      >
                        ▶ Play
                      </button>

                      <a
                        href="${downloadUrl}"
                        download
                      >
                        Download
                      </a>

                    </div>

                  `
                  : ""
              }

            </div>

          `;
        }
      ).join("")}

    </div>
  `;
}


// ==========================================
// PLAY VIDEO FROM HISTORY
// ==========================================

function playHistoryVideo(
  videoUrl
) {

  videoContainer.innerHTML = `

    <div class="result-card">

      <h2>
        Video from History 🎬
      </h2>

      <video
        class="result-video"
        controls
        playsinline
        autoplay
      >

        <source
          src="${videoUrl}"
          type="video/mp4"
        />

        Your browser does not support
        HTML5 video.

      </video>

    </div>

  `;

  videoContainer.scrollIntoView({
    behavior: "smooth"
  });
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(
  value
) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


// ==========================================
// LOAD HISTORY WHEN PAGE OPENS
// ==========================================

loadVideoHistory();