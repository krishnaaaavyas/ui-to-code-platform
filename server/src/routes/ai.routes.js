const express = require("express");
const router = express.Router();
const controller = require("../controllers/ai.controller");
const requireAuth = require("../middleware/requireAuth");
const rateLimiter = require("../middleware/rateLimiter");
const validateAiPayload = require("../middleware/validateAiPayload");

// Apply authentication to all AI routes
router.use(requireAuth);

// Apply rate limiting to all AI routes (30 requests per 15 minutes)
const aiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
});
router.use(aiLimiter);

/**
 * POST /api/ai/generate
 * Full pipeline: canvas elements → UI AST → LLM normalize → code generation
 * Body: { elements, boardConfig }
 */
router.post("/generate", validateAiPayload, controller.generateCode);
router.post("/generate-code", validateAiPayload, controller.generateCode);

/**
 * POST /api/ai/schema
 * Light pipeline: canvas elements → UI AST + design tokens only (no LLM)
 * Useful for debugging / previewing intermediate representation
 * Body: { elements, boardConfig }
 */
router.post("/schema", validateAiPayload, controller.getSchema);

/**
 * POST /api/ai/normalize-ui-schema
 * Normalize raw UI schema using LLM
 */
router.post("/normalize-ui-schema", controller.normalizeSchema);

/**
 * POST /api/ai/refine
 * Refine existing generated code via simple format (code + instruction)
 */
router.post("/refine", validateAiPayload, controller.refineCode);

/**
 * POST /api/ai/refine-code
 * Refine existing generated code via standard format (normalizedSchema + files + instruction)
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
