const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth.controller");
const requireAuth = require("../middleware/requireAuth");
const rateLimiter = require("../middleware/rateLimiter");

// Limit registration and login attempts to 5 requests per 15 minutes
const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

router.post("/register", authLimiter, controller.register);
router.post("/login", authLimiter, controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);

module.exports = router;
