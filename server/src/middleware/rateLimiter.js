const rateLimitStore = new Map();

/**
 * Lightweight in-memory rate limiter middleware
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds
 * @param {number} options.max Maximum requests allowed in the time window
 */
module.exports = function rateLimiter({ windowMs, max }) {
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const now = Date.now();

    if (!rateLimitStore.has(ip)) {
      rateLimitStore.set(ip, []);
    }

    const requests = rateLimitStore.get(ip);
    // Filter requests that are within the current time window
    const activeRequests = requests.filter((timestamp) => now - timestamp < windowMs);

    if (activeRequests.length >= max) {
      return res.status(429).json({
        error: "Too many authentication attempts. Please try again later.",
      });
    }

    activeRequests.push(now);
    rateLimitStore.set(ip, activeRequests);
    next();
  };
};
