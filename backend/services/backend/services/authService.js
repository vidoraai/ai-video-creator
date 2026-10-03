const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
  pool
} = require("./database");


// ==========================================
// AUTH CONFIGURATION
// ==========================================

const JWT_SECRET =
  process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn(
    "JWT_SECRET is not configured. Authentication tokens cannot be created safely."
  );
}

const TOKEN_EXPIRATION =
  process.env.JWT_EXPIRATION ||
  "7d";


// ==========================================
// NORMALIZE EMAIL
// ==========================================

function normalizeEmail(
  email
) {
  return String(
    email || ""
  )
    .trim()
    .toLowerCase();
}


// ==========================================
// VALIDATE EMAIL
// ==========================================

function isValidEmail(
  email
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}


// ==========================================
// CREATE USER
// ==========================================

async function createUser({
  email,
  password,
  name
}) {
  const normalizedEmail =
    normalizeEmail(
      email
    );

  const normalizedName =
    String(
      name || ""
    ).trim();

  if (
    !normalizedEmail ||
    !isValidEmail(
      normalizedEmail
    )
  ) {
    throw new Error(
      "A valid email address is required."
    );
  }

  if (
    !password ||
    String(password).length < 8
  ) {
    throw new Error(
      "Password must be at least 8 characters long."
    );
  }

  if (
    normalizedName.length > 255
  ) {
    throw new Error(
      "Name is too long."
    );
  }


  // ========================================
  // CHECK EXISTING USER
  // ========================================

  const existingUser =
    await pool.query(
      `
        SELECT
          id
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [
        normalizedEmail
      ]
    );

  if (
    existingUser.rows.length > 0
  ) {
    throw new Error(
      "An account with this email already exists."
    );
  }


  // ========================================
  // HASH PASSWORD
  // ========================================

  const passwordHash =
    await bcrypt.hash(
      String(password),
      12
    );


  // ========================================
  // CREATE USER
  // ========================================

  const result =
    await pool.query(
      `
        INSERT INTO users (
          email,
          password_hash,
          name
        )
        VALUES (
          $1,
          $2,
          $3
        )
        RETURNING
          id,
          email,
          name,
          created_at
      `,
      [
        normalizedEmail,
        passwordHash,
        normalizedName ||
          null
      ]
    );


  return result.rows[0];
}


// ==========================================
// FIND USER BY EMAIL
// ==========================================

async function findUserByEmail(
  email
) {
  const normalizedEmail =
    normalizeEmail(
      email
    );

  if (
    !normalizedEmail
  ) {
    return null;
  }

  const result =
    await pool.query(
      `
        SELECT
          id,
          email,
          password_hash,
          name,
          created_at
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [
        normalizedEmail
      ]
    );

  return (
    result.rows[0] ||
    null
  );
}


// ==========================================
// FIND USER BY ID
// ==========================================

async function findUserById(
  userId
) {
  const id =
    Number(userId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  const result =
    await pool.query(
      `
        SELECT
          id,
          email,
          name,
          created_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [
        id
      ]
    );

  return (
    result.rows[0] ||
    null
  );
}


// ==========================================
// VERIFY PASSWORD
// ==========================================

async function verifyPassword(
  password,
  passwordHash
) {
  if (
    !password ||
    !passwordHash
  ) {
    return false;
  }

  return bcrypt.compare(
    String(password),
    passwordHash
  );
}


// ==========================================
// CREATE AUTH TOKEN
// ==========================================

function createAuthToken(
  user
) {
  if (!JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not configured on the server."
    );
  }

  return jwt.sign(
    {
      userId:
        user.id,

      email:
        user.email
    },
    JWT_SECRET,
    {
      expiresIn:
        TOKEN_EXPIRATION
    }
  );
}


// ==========================================
// VERIFY AUTH TOKEN
// ==========================================

function verifyAuthToken(
  token
) {
  if (
    !JWT_SECRET
  ) {
    throw new Error(
      "JWT_SECRET is not configured on the server."
    );
  }

  return jwt.verify(
    token,
    JWT_SECRET
  );
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  createAuthToken,
  verifyAuthToken,
  normalizeEmail,
  isValidEmail
};