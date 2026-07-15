const { getOpenAIClient } = require("./openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");

// ─── UINode Schema (Zod) ────────────────────────────────────────────────────
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

async function normalizeWithLLM(rawSchema, tokens) {
  const client = getOpenAIClient();
  if (!client) {
    console.log("[normalizeWithLLM] OpenAI API Key absent. Utilizing fallback raw schema.");
    return {
      ...rawSchema,
      designTokens: tokens,
      layout: "free-form",
      componentType: "mixed",
    };
  }

  const systemPrompt = `You are a UI/UX expert and design-to-code specialist.
Normalize and enrich the raw UI schema using design tokens. Reclassify element kinds where appropriate.`;

  const userMessage = `Here is the raw heuristic UI schema:
\`\`\`json
${JSON.stringify(rawSchema, null, 2)}
\`\`\`
Design tokens:
\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\``;

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
        max_tokens: 4000,
      }, {
        timeout: 30000, // 30s timeout
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Empty content received from OpenAI.");
      }
      return JSON.parse(content);
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
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

module.exports = normalizeWithLLM;
