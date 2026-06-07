const inferUiSchema = require("../ai/inferUiSchema");
const extractDesignTokens = require("../ai/extractDesignTokens");
const normalizeWithLLM = require("../ai/normalizeWithLLM");
const generateCodeWithLLM = require("../ai/generateCodeWithLLM");
const refineCodeWithLLM = require("../ai/refineCodeWithLLM");
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
        boardWidth: docData.boardSettings?.boardWidth ?? docData.boardWidth,
        boardHeight: docData.boardSettings?.boardHeight ?? docData.boardHeight,
        backgroundColor: docData.boardSettings?.backgroundColor ?? docData.backgroundColor,
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
        boardWidth: docData.boardSettings?.boardWidth ?? docData.boardWidth,
        boardHeight: docData.boardSettings?.boardHeight ?? docData.boardHeight,
        backgroundColor: docData.boardSettings?.backgroundColor ?? docData.backgroundColor,
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

/**
 * POST /api/ai/normalize-ui-schema
 * Body: { elements, boardConfig, rawSchema, tokens } OR { documentId }
 *
 * Runs Steps 1-3 of the pipeline:
 *  1. Infer semantic UI schema
 *  2. Extract design tokens
 *  3. Normalize + enrich with LLM
 */
exports.normalizeSchema = async (req, res, next) => {
  try {
    let rawSchema = req.body.rawSchema;
    let tokens = req.body.tokens;

    if (!rawSchema || !tokens) {
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
          boardWidth: docData.boardSettings?.boardWidth ?? docData.boardWidth,
          boardHeight: docData.boardSettings?.boardHeight ?? docData.boardHeight,
          backgroundColor: docData.boardSettings?.backgroundColor ?? docData.backgroundColor,
        };
      } else {
        elements = req.body.elements || [];
        boardConfig = req.body.boardConfig || {};
      }

      if (!Array.isArray(elements) || elements.length === 0) {
        return res.status(400).json({ error: "No canvas elements provided." });
      }

      if (!rawSchema) {
        rawSchema = inferUiSchema(elements, boardConfig);
      }
      if (!tokens) {
        tokens = extractDesignTokens(elements);
      }
    }

    const normalizedSchema = await normalizeWithLLM(rawSchema, tokens);
    return res.status(200).json(normalizedSchema);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai/refine-code
 * Body: { normalizedSchema, files, instruction, stack }
 *
 * Refines existing code files based on instruction.
 */
exports.refineCode = async (req, res, next) => {
  try {
    const { normalizedSchema, files, instruction, stack } = req.body;

    if (!instruction) {
      return res.status(400).json({ error: "Instruction is required for refinement." });
    }
    if (!normalizedSchema) {
      return res.status(400).json({ error: "Normalized UI Schema is required." });
    }

    const refined = await refineCodeWithLLM(normalizedSchema, files || [], instruction);

    return res.status(200).json({
      success: true,
      generated: refined,
    });
  } catch (err) {
    next(err);
  }
};

