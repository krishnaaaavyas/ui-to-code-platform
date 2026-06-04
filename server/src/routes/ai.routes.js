const express = require("express");
const router = express.Router();
const controller = require("../controllers/ai.controller");
const requireAuth = require("../middleware/requireAuth");

// All AI routes require authentication
router.use(requireAuth);

/**
 * POST /api/ai/generate
 * Full pipeline: canvas elements → UI AST → LLM normalize → code generation
 * Body: { elements, boardConfig } or { documentId }
 */
router.post("/generate", controller.generateCode);

/**
 * POST /api/ai/schema
 * Light pipeline: canvas elements → UI AST + design tokens only (no LLM)
 * Useful for debugging / previewing intermediate representation
 * Body: { elements, boardConfig } or { documentId }
 */
router.post("/schema", controller.getSchema);

module.exports = router;
