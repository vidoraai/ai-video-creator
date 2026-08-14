const express = require("express");

const router = express.Router();

router.post("/generate", (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      message: "Video prompt is required."
    });
  }

  res.json({
    success: true,
    message: "Video generation request received.",
    prompt: prompt.trim(),
    status: "queued"
  });
});

module.exports = router;
