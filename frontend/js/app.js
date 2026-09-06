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

      // ======================================
      // CREATE VIDEO JOB
      // ======================================

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


      // ======================================
      // CHECK JOB UNTIL FINISHED
      // ======================================

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


        // ----------------------------------
        // QUEUED
        // ----------------------------------

        if (
          job.status === "queued"
        ) {

          status.textContent =
            "Your video is queued...";
        }


        // ----------------------------------
        // GENERATING
        // ----------------------------------

        else if (
          job.status === "generating"
        ) {

          const completed =
            job.completedScenes || 0;

          const total =
            job.sceneCount || 0;


          if (total > 0) {

            status.textContent =
              `Generating video... Scene ${completed} of ${total}`;

          } else {

            status.textContent =
              "Generating your video...";
          }
        }


        // ----------------------------------
        // ASSEMBLING
        // ----------------------------------

        else if (
          job.status === "assembling"
        ) {

          status.textContent =
            "Assembling your finished video...";
        }


        // ----------------------------------
        // COMPLETED
        // ----------------------------------

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
        }


        // ----------------------------------
        // FAILED
        // ----------------------------------

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


        // ----------------------------------
        // CANCELLED
        // ----------------------------------

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
