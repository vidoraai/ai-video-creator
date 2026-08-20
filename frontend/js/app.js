const button = document.getElementById("createVideo");
const prompt = document.getElementById("prompt");
const status = document.getElementById("status");

button.addEventListener("click", async () => {
  const videoPrompt = prompt.value.trim();

  if (!videoPrompt) {
    status.textContent = "Please describe the video you want to create.";
    return;
  }

  status.textContent = "Starting video generation...";

  try {
    const response = await fetch(
      "https://vidora-ai-99yg.onrender.com/api/videos/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: videoPrompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    const videoId = data.id;

    if (!videoId) {
      throw new Error("No video ID was returned.");
    }

    status.textContent = "Video generation started. Please wait...";

    let finished = false;

    while (!finished) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const statusResponse = await fetch(
        `https://vidora-ai-99yg.onrender.com/api/videos/${videoId}`
      );

      const statusData = await statusResponse.json();

      if (!statusResponse.ok) {
        throw new Error(
          statusData.message || "Unable to check video status."
        );
      }

      const currentStatus = statusData.status;

      if (currentStatus === "completed") {
        finished = true;
        status.textContent = "Video generation completed!";
      } else if (
        currentStatus === "failed" ||
        currentStatus === "cancelled"
      ) {
        finished = true;
        status.textContent =
          "Video generation failed: " + currentStatus;
      } else {
        status.textContent =
          "Generating video... Status: " + currentStatus;
      }
    }
  } catch (error) {
    console.error(error);
    status.textContent =
      "Unable to generate the video: " + error.message;
  }
});
