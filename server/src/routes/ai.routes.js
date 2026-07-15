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
router.post("/generate-code", controller.generateCode);

/**
 * POST /api/ai/schema
 * Light pipeline: canvas elements → UI AST + design tokens only (no LLM)
 * Useful for debugging / previewing intermediate representation
 * Body: { elements, boardConfig } or { documentId }
 */
router.post("/schema", controller.getSchema);

/**
 * POST /api/ai/normalize-ui-schema
 * Normalize raw UI schema using LLM
 */
router.post("/normalize-ui-schema", controller.normalizeSchema);

/**
 * POST /api/ai/refine-code
 * Refine existing generated code
 */
router.post("/refine-code", controller.refineCode);

/**
 * GET /api/ai/status
 * Check if AI features (OpenAI API key) are enabled on the backend
 */
router.get("/status", (req, res) => {
  res.json({ enabled: !!process.env.OPENAI_API_KEY });
});

module.exports = router;

