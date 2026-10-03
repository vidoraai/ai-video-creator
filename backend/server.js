require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  testDatabaseConnection,
  initializeDatabase
} = require("./services/database");

const videoRoutes =
  require("./routes/videoRoutes");

const authRoutes =
  require("./routes/authRoutes");


const app =
  express();


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors()
);

app.use(
  express.json()
);


// ==========================================
// ROOT
// ==========================================

app.get(
  "/",
  (req, res) => {
    res.json({
      name:
        "Vidora AI",

      status:
        "online"
    });
  }
);


// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success:
        true,

      message:
        "Vidora AI backend is running"
    });
  }
);


// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.use(
  "/api/auth",
  authRoutes
);


// ==========================================
// VIDEO ROUTES
// ==========================================

app.use(
  "/api/videos",
  videoRoutes
);


// ==========================================
// START SERVER
// ==========================================

const PORT =
  process.env.PORT ||
  5000;


app.listen(
  PORT,
  "0.0.0.0",
  async () => {
    console.log(
      "Vidora AI backend running on port " +
      PORT
    );


    if (
      process.env.DATABASE_URL
    ) {
      try {

        await testDatabaseConnection();

        await initializeDatabase();

      } catch (error) {

        console.error(
          "Database setup failed:",
          error.message
        );
      }

    } else {

      console.log(
        "DATABASE_URL is not configured yet."
      );
    }
  }
);