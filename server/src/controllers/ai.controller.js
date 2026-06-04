const inferUiSchema = require("../ai/inferUiSchema");
const extractDesignTokens = require("../ai/extractDesignTokens");
const normalizeWithLLM = require("../ai/normalizeWithLLM");
const generateCodeWithLLM = require("../ai/generateCodeWithLLM");
const documentsService = require("../services/documents.service");

/**
 * POST /api/ai/generate
 * Body: { elements, boardConfig } OR { documentId }
 *
 * Runs the full 4-step Design-to-Code pipeline:
 *  1. Infer semantic UI schema from canvas elements
 *  2. Extract design tokens (colors, fonts, radii)
 *  3. Normalize schema with LLM (enrich, classify, correct)
 *  4. Generate React + Tailwind code with LLM
 */
exports.generateCode = async (req, res, next) => {
  try {
    let elements = [];
    let boardConfig = {};

    // Option A: Load from a saved document
    if (req.body.documentId) {
      const doc = await documentsService.getById(req.body.documentId, req.user.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      const docData = doc.data || {};
      elements = docData.elements || [];
      boardConfig = {
        boardWidth: docData.boardWidth,
        boardHeight: docData.boardHeight,
        backgroundColor: docData.backgroundColor,
      };
    } else {
      // Option B: Accept elements directly in body
      elements = req.body.elements || [];
      boardConfig = req.body.boardConfig || {};
    }

    if (!Array.isArray(elements) || elements.length === 0) {
      return res.status(400).json({ error: "No canvas elements provided. Add some shapes to your design first." });
    }

    // Step 1: Infer semantic UI schema
    const rawSchema = inferUiSchema(elements, boardConfig);

    // Step 2: Extract design tokens
    const tokens = extractDesignTokens(elements);

    // Step 3: Normalize + enrich with LLM
    const normalizedSchema = await normalizeWithLLM(rawSchema, tokens);

    // Step 4: Generate React + Tailwind code
    const generatedCode = await generateCodeWithLLM(normalizedSchema);

    return res.status(200).json({
      success: true,
      pipeline: {
        rawSchema,
        tokens,
        normalizedSchema,
      },
      generated: generatedCode,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai/schema
 * Body: { elements, boardConfig } OR { documentId }
 *
 * Only runs Steps 1 & 2 — returns the raw + token data only.
 * Useful for debugging or previewing the intermediate AST.
 */
exports.getSchema = async (req, res, next) => {
  try {
    let elements = [];
    let boardConfig = {};

    if (req.body.documentId) {
      const doc = await documentsService.getById(req.body.documentId, req.user.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      const docData = doc.data || {};
      elements = docData.elements || [];
      boardConfig = {
        boardWidth: docData.boardWidth,
        boardHeight: docData.boardHeight,
        backgroundColor: docData.backgroundColor,
      };
    } else {
      elements = req.body.elements || [];
      boardConfig = req.body.boardConfig || {};
    }

    if (!Array.isArray(elements) || elements.length === 0) {
      return res.status(400).json({ error: "No canvas elements provided." });
    }

    const rawSchema = inferUiSchema(elements, boardConfig);
    const tokens = extractDesignTokens(elements);

    return res.status(200).json({
      rawSchema,
      tokens,
    });
  } catch (err) {
    next(err);
  }
};
