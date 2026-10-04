const { verifyToken } = require("../services/authService");

function authMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing."
      });
    }

    const user = verifyToken(token);

    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
}

module.exports = {
  authMiddleware
};