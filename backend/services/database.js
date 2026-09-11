const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on("error", (error) => {
  console.error("Unexpected database error:", error);
});

async function testDatabaseConnection() {
  const client = await pool.connect();

  try {
    await client.query("SELECT NOW()");
    console.log("Vidora AI database connected");
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  const schemaPath = path.join(
    __dirname,
    "..",
    "schema.sql"
  );

  const schema = fs.readFileSync(
    schemaPath,
    "utf8"
  );

  await pool.query(schema);

  console.log(
    "Vidora AI database tables initialized"
  );
}

module.exports = {
  pool,
  testDatabaseConnection,
  initializeDatabase
};