const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── UINode Schema (Zod) ────────────────────────────────────────────────────
// Recursive schema for a semantic UI node tree returned by LLM normalization.
const UIStylesSchema = z.object({
  backgroundColor: z.string().nullable(),
  color: z.string().nullable(),
  borderColor: z.string().nullable(),
  borderRadius: z.string().nullable(),
  fontSize: z.string().nullable(),
  fontWeight: z.string().nullable(),
  padding: z.string().nullable(),
  gap: z.string().nullable(),
  width: z.string().nullable(),
  height: z.string().nullable(),
});

// Zod does not natively support recursive schemas elegantly; we define depth-2 manually
const UINodeLeafSchema = z.object({
  id: z.string(),
  kind: z.enum(["container", "card", "button", "input", "text", "image", "icon", "navbar", "hero", "footer", "sidebar", "unknown"]),
  name: z.string().nullable(),
  text: z.string().nullable(),
  url: z.string().nullable(),
  placeholder: z.string().nullable(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  styles: UIStylesSchema.nullable(),
  children: z.array(z.object({
    id: z.string(),
    kind: z.enum(["container", "card", "button", "input", "text", "image", "icon", "navbar", "hero", "footer", "sidebar", "unknown"]),
    name: z.string().nullable(),
    text: z.string().nullable(),
    url: z.string().nullable(),
    placeholder: z.string().nullable(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    styles: UIStylesSchema.nullable(),
    children: z.array(z.any()).nullable(),
  })).nullable(),
});

const NormalizedUISchemaSchema = z.object({
  page: z.object({
    width: z.number(),
    height: z.number(),
    backgroundColor: z.string().nullable(),
    title: z.string().nullable(),
    description: z.string().nullable(),
  }),
  designTokens: z.object({
    colors: z.record(z.string()).nullable(),
    fonts: z.object({
      families: z.array(z.string()).nullable(),
      sizes: z.record(z.string()).nullable(),
      weights: z.array(z.union([z.string(), z.number()])).nullable(),
    }).nullable(),
    radii: z.array(z.string()).nullable(),
  }).nullable(),
  nodes: z.array(UINodeLeafSchema),
  layout: z.enum(["single-column", "two-column", "grid", "sidebar-layout", "free-form"]).nullable(),
  componentType: z.enum(["landing-page", "dashboard", "form", "card-list", "modal", "nav", "mixed"]).nullable(),
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

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[normalizeWithLLM] Calling OpenAI API (attempt ${attempt}/${maxAttempts})...`);
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: zodResponseFormat(NormalizedUISchemaSchema, "ui_schema"),
        temperature: attempt === 1 ? 0.2 : 0.4,
        max_tokens: 4096,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Empty content received from OpenAI.");
      }
      const result = JSON.parse(content);
      return result;
    } catch (err) {
      console.warn(`[normalizeWithLLM] Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxAttempts) {
        console.error("[normalizeWithLLM] All attempts failed. Utilizing fallback raw schema.");
        return {
          ...rawSchema,
          designTokens: tokens,
          layout: "free-form",
          componentType: "mixed",
        };
      }
      // Delay before retrying
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

module.exports = normalizeWithLLM;
