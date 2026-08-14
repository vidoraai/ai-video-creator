const button = document.getElementById("createVideo");
const prompt = document.getElementById("prompt");
const status = document.getElementById("status");

button.addEventListener("click", function () {
  const videoPrompt = prompt.value.trim();

  if (videoPrompt === "") {
    status.textContent = "Please describe the video you want to create.";
    return;
  }

  status.textContent = "Your video request has been received...";
});
