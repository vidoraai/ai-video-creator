const button = document.getElementById("createVideo");
const prompt = document.getElementById("prompt");
const status = document.getElementById("status");

const duration = document.getElementById("duration");
const aspectRatio = document.getElementById("aspectRatio");
const style = document.getElementById("style");

button.addEventListener("click", async () => {
  const videoPrompt = prompt.value.trim();

  if (!videoPrompt) {
    status.textContent = "Please describe the video you want to create.";
    return;
  }

  status.textContent = "Creating your video job...";
  button.disabled = true;

  try {
    const response = await fetch(
      "https://vidora-ai-99yg.onrender.com/api/videos/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: videoPrompt,
          duration: duration.value,
          aspectRatio: aspectRatio.value,
          style: style.value
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    const jobId = data.jobId;

    if (!jobId) {
      throw new Error("No job ID was returned.");
    }

    status.textContent =
      "Video job created successfully. Preparing your video...";

    let finished = false;

    while (!finished) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const jobResponse = await fetch(
        `https://vidora-ai-99yg.onrender.com/api/videos/job/${jobId}`
      );

      const jobData = await jobResponse.json();

      if (!jobResponse.ok) {
        throw new Error(
          jobData.message || "Unable to check video job."
        );
      }

      const job = jobData.job;

      status.textContent =
        "Video status: " + job.status;

      if (job.status === "completed") {
        finished = true;

        status.textContent =
          "Video generation completed!";
      }

      if (
        job.status === "failed" ||
        job.status === "cancelled"
      ) {
        finished = true;

        status.textContent =
          "Video generation failed: " + job.status;
      }
    }

  } catch (error) {
    console.error(error);

    status.textContent =
      "Unable to create video: " + error.message;

  } finally {
    button.disabled = false;
  }
});
