const button = document.getElementById("createVideo");
const prompt = document.getElementById("prompt");
const status = document.getElementById("status");

button.addEventListener("click", async () => {
const videoPrompt = prompt.value.trim();

if (!videoPrompt) {
status.textContent = "Please describe the video you want to create.";
return;
}

status.textContent = "Sending your video request...";

try {
const response = await fetch("https://vidora-ai-99yg.onrender.com/api/videos/generate", {
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
prompt: videoPrompt
})
});
const data = await response.json();
if (!response.ok) {
throw new Error(data.message || "Request failed");
}
status.textContent = "Video request received. Status: " + data.status;
} catch (error) {
status.textContent = "Unable to connect to Vidora AI server.";
console.error(error);
}
});
