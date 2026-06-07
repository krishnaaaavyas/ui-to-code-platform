const { z } = require("zod");

const canvasElementSchema = z.object({
  id: z.string(),
  type: z.enum(["rect", "rectangle", "circle", "triangle", "diamond", "line", "text", "path", "image", "pen"]),
  x: z.number(),
  y: z.number(),
  visible: z.boolean().optional(),
  hidden: z.boolean().optional(),
  locked: z.boolean().optional(),
  name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
  fill: z.string().optional().nullable(),
  stroke: z.string().optional().nullable(),
  strokeWidth: z.number().optional(),
  lineCap: z.string().optional(),
  points: z.array(z.number()).optional(),
  rotation: z.number().optional(),
  src: z.string().optional().nullable(),
  zIndex: z.number().optional(),
});

const documentDataSchema = z.object({
  board: z.object({
    width: z.number(),
    height: z.number(),
    background: z.string(),
  }).optional(),
  boardWidth: z.number().optional(),
  boardHeight: z.number().optional(),
  backgroundColor: z.string().optional(),
  elements: z.array(canvasElementSchema),
  version: z.number().optional(),
}).refine((data) => {
  return !!(data.board || (data.boardWidth !== undefined && data.boardHeight !== undefined && data.backgroundColor !== undefined));
}, {
  message: "Either board or legacy board properties must be provided",
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
