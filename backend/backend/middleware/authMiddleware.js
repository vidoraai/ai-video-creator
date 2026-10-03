const {
  verifyAuthToken,
  findUserById
} = require("../services/authService");


// ==========================================
// REQUIRE AUTHENTICATION
// ==========================================

async function requireAuth(
  req,
  res,
  next
) {
  try {

    const authorization =
      req.headers.authorization || "";


    if (
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success:
          false,

        message:
          "Authentication is required."
      });
    }


    const token =
      authorization
        .slice(7)
        .trim();


    if (
      !token
    ) {
      return res.status(401).json({
        success:
          false,

        message:
          "Authentication token is required."
      });
    }


    const decoded =
      verifyAuthToken(
        token
      );


    if (
      !decoded ||
      !decoded.userId
    ) {
      return res.status(401).json({
        success:
          false,

        message:
          "Invalid authentication token."
      });
    }


    const user =
      await findUserById(
        decoded.userId
      );


    if (
      !user
    ) {
      return res.status(401).json({
        success:
          false,

        message:
          "User account could not be found."
      });
    }


    // ======================================
    // ATTACH USER TO REQUEST
    // ======================================

    req.user =
      user;


    next();

  } catch (error) {

    console.error(
      "Authentication error:",
      error.message
    );


    return res.status(401).json({
      success:
        false,

      message:
        "Invalid or expired authentication token."
    });
  }
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {
  requireAuth
};