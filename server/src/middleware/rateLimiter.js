const rateLimit = require("express-rate-limit");

/**
 * Standard Express rate limiter middleware
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds
 * @param {number} options.max Maximum requests allowed in the time window
 */
module.exports = function rateLimiter({ windowMs, max }) {
  if (process.env.NODE_ENV === "test") {
    // Bypass rate limiting in testing environment to prevent test flakiness
    return (req, res, next) => next();
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false },
    message: {
      error: "Too many requests. Please try again later.",
    },
    keyGenerator: (req) => {
      return req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    },
  });
};
