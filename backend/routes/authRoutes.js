const express = require("express");

const {
  register,
  login
} = require("../services/authService");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const result = await register({
      email,
      password,
      name
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      ...result
    });

  } catch (error) {
    console.error("Registration error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Registration failed."
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await login({
      email,
      password
    });

    return res.json({
      success: true,
      message: "Login successful.",
      ...result
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(401).json({
      success: false,
      message: error.message || "Login failed."
    });
  }
});

module.exports = router;