const express = require("express");

const {
  hashPassword,
  comparePassword,
  createToken
} = require("../services/authService");

const { pool } = require("../services/database");

const router = express.Router();


// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [email.trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const passwordHash =
      await hashPassword(password);

    const result = await pool.query(
      `
      INSERT INTO users (
        email,
        password_hash,
        name
      )
      VALUES ($1, $2, $3)
      RETURNING id, email, name, created_at
      `,
      [
        email.trim().toLowerCase(),
        passwordHash,
        name ? name.trim() : null
      ]
    );

    const user = result.rows[0];

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create account."
    });
  }
});


// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        email,
        password_hash,
        name,
        created_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const user = result.rows[0];

    const passwordMatches =
      await comparePassword(
        password,
        user.password_hash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to log in."
    });
  }
});


module.exports = router;