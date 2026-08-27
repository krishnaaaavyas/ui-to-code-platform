const { z } = require("zod");

// Element schema with required properties: x, y, width, height, type
const elementSchema = z.object({
  type: z.string({ required_error: "Element type is required" }),
  x: z.number({ required_error: "Element x coordinate is required" }),
  y: z.number({ required_error: "Element y coordinate is required" }),
  width: z.number({ required_error: "Element width is required" }),
  height: z.number({ required_error: "Element height is required" }),
});

const generatePayloadSchema = z.object({
  elements: z.array(elementSchema, { required_error: "elements array is required" })
    .nonempty({ message: "elements array cannot be empty" }),
  boardConfig: z.object({}).passthrough().optional(),
});

const refinePayloadSchema = z.object({
  code: z.string({ required_error: "code is required" }).min(1, { message: "code cannot be empty" }),
  instruction: z.string({ required_error: "instruction is required" }),
});

module.exports = (req, res, next) => {
  const path = req.path;

  let schema;
  if (path.includes("/generate")) {
    schema = generatePayloadSchema;
  } else if (path.includes("/refine")) {
    schema = refinePayloadSchema;
  }

  if (!schema) {
    return next();
  }

  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errorsArray = result.error.issues || result.error.errors || [];
    return res.status(400).json({
      error: "Validation failed",
      details: errorsArray.map(err => ({
        path: err.path.join("."),
        message: err.message
      }))
    });
  }

  next();
};
