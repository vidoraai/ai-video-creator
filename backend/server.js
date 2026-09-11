const {
  testDatabaseConnection,
  initializeDatabase
} = require("./services/database");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const videoRoutes = require("./routes/videoRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
res.json({
name: "Vidora AI",
status: "online"
});
});

app.get("/api/health", (req, res) => {
res.json({
success: true,
message: "Vidora AI backend is running"
});
});

app.use("/api/videos", videoRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", async () => {
  console.log("Vidora AI backend running on port " + PORT);

  if (process.env.DATABASE_URL) {
  try {
    await testDatabaseConnection();
    await initializeDatabase();
  } catch (error) {
    console.error(
      "Database setup failed:",
      error.message
    );
  }
}
