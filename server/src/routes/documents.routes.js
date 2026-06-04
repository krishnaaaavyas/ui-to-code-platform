const express = require("express");
const router = express.Router();
const controller = require("../controllers/documents.controller");
const validator = require("../middleware/validateJson");
const requireAuth = require("../middleware/requireAuth");

// Protect all document routes with JWT authentication middleware
router.use(requireAuth);

router.post("/", validator.validateCreate, controller.createDocument);
router.get("/", controller.listDocuments);
router.get("/:id", controller.getDocument);
router.put("/:id", validator.validateUpdate, controller.updateDocument);
router.delete("/:id", controller.deleteDocument);

// Version history routes
router.get("/:id/versions", controller.listVersions);
router.get("/:id/versions/:versionId", controller.getVersion);
router.post("/:id/restore/:versionId", controller.restoreVersion);

module.exports = router;
