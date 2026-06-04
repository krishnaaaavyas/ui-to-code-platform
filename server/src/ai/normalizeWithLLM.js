const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── UINode Schema (Zod) ────────────────────────────────────────────────────
// Recursive schema for a semantic UI node tree returned by LLM normalization.
const UIStylesSchema = z.object({
  backgroundColor: z.string().optional(),
  color: z.string().optional(),
  borderColor: z.string().optional(),
  borderRadius: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.string().optional(),
  padding: z.string().optional(),
  gap: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
});

// Zod does not natively support recursive schemas elegantly; we define depth-2 manually
const UINodeLeafSchema = z.object({
  id: z.string(),
  kind: z.enum(["container", "card", "button", "input", "text", "image", "icon", "navbar", "hero", "footer", "sidebar", "unknown"]),
  name: z.string().optional(),
  text: z.string().optional(),
  url: z.string().optional(),
  placeholder: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  styles: UIStylesSchema.optional(),
  children: z.array(z.object({
    id: z.string(),
    kind: z.enum(["container", "card", "button", "input", "text", "image", "icon", "navbar", "hero", "footer", "sidebar", "unknown"]),
    name: z.string().optional(),
    text: z.string().optional(),
    url: z.string().optional(),
    placeholder: z.string().optional(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    styles: UIStylesSchema.optional(),
    children: z.array(z.any()).optional(),
  })).optional(),
});

const NormalizedUISchemaSchema = z.object({
  page: z.object({
    width: z.number(),
    height: z.number(),
    backgroundColor: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  designTokens: z.object({
    colors: z.record(z.string()).optional(),
    fonts: z.object({
      families: z.array(z.string()).optional(),
      sizes: z.record(z.string()).optional(),
      weights: z.array(z.union([z.string(), z.number()])).optional(),
    }).optional(),
    radii: z.array(z.string()).optional(),
  }).optional(),
  nodes: z.array(UINodeLeafSchema),
  layout: z.enum(["single-column", "two-column", "grid", "sidebar-layout", "free-form"]).optional(),
  componentType: z.enum(["landing-page", "dashboard", "form", "card-list", "modal", "nav", "mixed"]).optional(),
});

/**
 * Calls the LLM to normalize and enrich the heuristic UI schema.
 * The LLM corrects semantic kinds, infers missing component types,
 * enriches styles, and classifies layout patterns.
 *
 * @param {Object} rawSchema - Output of inferUiSchema
 * @param {Object} tokens - Design tokens from extractDesignTokens
 * @returns {Object} Normalized, enriched UI schema
 */
async function normalizeWithLLM(rawSchema, tokens) {
  if (!process.env.OPENAI_API_KEY) {
    // Graceful fallback: return the raw schema with tokens attached
    return {
      ...rawSchema,
      designTokens: tokens,
      layout: "free-form",
      componentType: "mixed",
    };
  }

  const systemPrompt = `You are a UI/UX expert and design-to-code specialist.
You receive a raw design schema parsed from a visual canvas editor, and a set of design tokens.
Your job is to:
1. Correct semantic "kind" classifications for nodes (e.g., identify navbars, heroes, forms, cards).
2. Infer placeholder text for input nodes.
3. Enrich styles using the provided design tokens (apply token names as CSS values).
4. Classify the overall page layout pattern.
5. Classify the overall component/page type.
6. Add a page title and brief description based on what you see in the design.
7. Return a cleaned, enriched UI schema that exactly matches the provided JSON schema.

Rules:
- Preserve all node IDs, positions, and sizes from the input.
- Do not hallucinate nodes. Only reclassify or enrich existing ones.
- If a rect is very wide and at the top of the page, it's likely a "navbar".
- If a tall rect covers most of the page width, it's likely a "hero".
- Groups of cards in a grid are "card" nodes.
- Multiple input fields together form a "form" layout.`;

  const userMessage = `Here is the raw heuristic UI schema:
\`\`\`json
${JSON.stringify(rawSchema, null, 2)}
\`\`\`

Here are the design tokens extracted from the canvas:
\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

Please normalize, enrich, and return the corrected UI schema.`;

  try {
    const completion = await client.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: zodResponseFormat(NormalizedUISchemaSchema, "ui_schema"),
      temperature: 0.2,
      max_tokens: 4096,
    });

    const result = completion.choices[0].message.parsed;
    return result;
  } catch (err) {
    console.error("[normalizeWithLLM] LLM call failed:", err.message);
    // Fallback: return raw schema + tokens
    return {
      ...rawSchema,
      designTokens: tokens,
      layout: "free-form",
      componentType: "mixed",
    };
  }
}

module.exports = normalizeWithLLM;
