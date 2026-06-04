const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth.controller");
const requireAuth = require("../middleware/requireAuth");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);

module.exports = router;
