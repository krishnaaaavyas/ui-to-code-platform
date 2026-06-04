const express = require("express");
const router = express.Router();
const controller = require("../controllers/documents.controller");
const validator = require("../middleware/validateJson");

router.post("/", validator.validateCreate, controller.createDocument);
router.get("/", controller.listDocuments);
router.get("/:id", controller.getDocument);
router.put("/:id", validator.validateUpdate, controller.updateDocument);
router.delete("/:id", controller.deleteDocument);

module.exports = router;
