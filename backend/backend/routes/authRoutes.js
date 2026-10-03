const express = require("express");

const {
  createUser,
  findUserByEmail,
  verifyPassword,
  createAuthToken
} = require("../services/authService");

const router =
  express.Router();


// ==========================================
// CREATE ACCOUNT
// ==========================================

router.post(
  "/register",
  async (req, res) => {
    try {
      const {
        email,
        password,
        name
      } = req.body;


      const user =
        await createUser({
          email,
          password,
          name
        });


      const token =
        createAuthToken(
          user
        );


      return res.status(201).json({
        success:
          true,

        message:
          "Vidora AI account created successfully.",

        token,

        user: {
          id:
            user.id,

          email:
            user.email,

          name:
            user.name,

          createdAt:
            user.created_at
        }
      });

    } catch (error) {

      console.error(
        "Registration error:",
        error
      );


      if (
        error.message ===
        "An account with this email already exists."
      ) {
        return res.status(409).json({
          success:
            false,

          message:
            error.message
        });
      }


      return res.status(400).json({
        success:
          false,

        message:
          error.message ||
          "Unable to create account."
      });
    }
  }
);


// ==========================================
// LOGIN
// ==========================================

router.post(
  "/login",
  async (req, res) => {
    try {
      const {
        email,
        password
      } = req.body;


      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          success:
            false,

          message:
            "Email and password are required."
        });
      }


      const user =
        await findUserByEmail(
          email
        );


      if (
        !user
      ) {
        return res.status(401).json({
          success:
            false,

          message:
            "Invalid email or password."
        });
      }


      const passwordValid =
        await verifyPassword(
          password,
          user.password_hash
        );


      if (
        !passwordValid
      ) {
        return res.status(401).json({
          success:
            false,

          message:
            "Invalid email or password."
        });
      }


      const token =
        createAuthToken(
          user
        );


      return res.json({
        success:
          true,

        message:
          "Login successful.",

        token,

        user: {
          id:
            user.id,

          email:
            user.email,

          name:
            user.name,

          createdAt:
            user.created_at
        }
      });

    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      return res.status(500).json({
        success:
          false,

        message:
          "Unable to log in."
      });
    }
  }
);


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports =
  router;