const { z } = require("zod");

const canvasElementSchema = z.object({
  id: z.string(),
  type: z.enum(["rect", "rectangle", "circle", "triangle", "diamond", "line", "text", "path"]),
  x: z.number(),
  y: z.number(),
  visible: z.boolean(),
  locked: z.boolean().optional(),
  name: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  lineCap: z.string().optional(),
  points: z.array(z.number()).optional(),
  rotation: z.number().optional(),
});

const documentDataSchema = z.object({
  boardWidth: z.number(),
  boardHeight: z.number(),
  backgroundColor: z.string(),
  elements: z.array(canvasElementSchema),
  version: z.number().optional(),
});

const createDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  data: documentDataSchema,
});

const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  data: documentDataSchema.optional(),
});

exports.validateCreate = (req, res, next) => {
  try {
    createDocumentSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: error.errors || error.message });
  }
};

exports.validateUpdate = (req, res, next) => {
  try {
    updateDocumentSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: error.errors || error.message });
  }
};
