const express = require("express");
const controller = require("../controllers/uploads.controller");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// Mock upload endpoint must be public to simulate direct S3 uploading
router.put("/mock-upload", controller.mockUpload);

// Secure other endpoints
router.post("/presign", requireAuth, controller.getPresignedUrl);
router.post("/assets", requireAuth, controller.registerAsset);
router.get("/documents/:id/assets", requireAuth, controller.listAssets);

module.exports = router;
