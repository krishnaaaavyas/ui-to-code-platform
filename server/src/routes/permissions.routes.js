const express = require("express");
const controller = require("../controllers/permissions.controller");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// Secure all permissions routes
router.use(requireAuth);

router.post("/:id/share", controller.shareDocument);
router.get("/:id/permissions", controller.listPermissions);
router.delete("/:id/permissions/:permissionId", controller.removePermission);

module.exports = router;
