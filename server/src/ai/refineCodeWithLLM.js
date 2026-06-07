const OpenAI = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Generated Code Schema ──────────────────────────────────────────────────
const GeneratedFileSchema = z.object({
  filename: z.string().describe("Filename, e.g. 'App.jsx' or 'Button.jsx'"),
  language: z.enum(["jsx", "tsx", "css", "json"]),
  content: z.string().describe("Full file content as a string"),
});

const GeneratedCodeSchema = z.object({
  framework: z.literal("react"),
  stylingLibrary: z.literal("tailwind"),
  files: z.array(GeneratedFileSchema),
  entryFile: z.string().describe("Name of the main entry file, e.g. 'App.jsx'"),
  description: z.string().describe("1-2 sentence description of the generated UI"),
  componentTree: z.array(z.string()).describe("List of component names used, e.g. ['Navbar', 'HeroCard', 'Button']"),
});

/**
 * Refines existing React + Tailwind component files based on a new user instruction.
 * Uses OpenAI structured outputs to guarantee valid JSON-wrapped code artifacts.
 *
 * @param {Object} normalizedSchema - Enriched UI schema
 * @param {Array} existingFiles - Existing generated files list: [{ filename, language, content }]
 * @param {string} instruction - User refinement prompt (e.g. "make it responsive", "add dark mode")
 * @returns {Object} Refined code files structure
 */
async function refineCodeWithLLM(normalizedSchema, existingFiles, instruction) {
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackRefinedCode(normalizedSchema, existingFiles, instruction);
  }

  const systemPrompt = `You are an expert React and Tailwind CSS developer.
You are given:
1. A normalized UI schema (design AST) representing a canvas design.
2. The existing generated React + Tailwind component files.
3. A user instruction describing requested modifications/improvements.

Your job is to refine, update, or rewrite the files to satisfy the user's instructions.

Rules:
- Output ONLY valid React functional components.
- Use Tailwind CSS utility classes for ALL styling.
- Break the design into separate reusable components if needed, or update the existing components.
- The entry file (e.g., App.jsx) should import and assemble sub-components.
- Each file must have full valid content (no placeholders, no "// TODO" comments, no partial code).
- Modify the code to satisfy the user instructions (e.g. make it responsive, change colors, layout changes, component composition).
- Retain the style/structure of unchanged parts where appropriate.
`;

  const userMessage = `Here is the normalized UI schema:
\`\`\`json
${JSON.stringify(normalizedSchema, null, 2)}
\`\`\`

Here are the existing generated files:
\`\`\`json
${JSON.stringify(existingFiles, null, 2)}
\`\`\`

User instructions for refinement:
${instruction}

Please return the updated complete list of files conforming to the schema.`;

  try {
    const completion = await client.beta.chat.completions.parse({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: zodResponseFormat(GeneratedCodeSchema, "generated_code"),
      temperature: 0.2,
      max_tokens: 8192,
    });

    const result = completion.choices[0].message.parsed;
    return result;
  } catch (err) {
    console.error("[refineCodeWithLLM] LLM call failed:", err.message);
    return buildFallbackRefinedCode(normalizedSchema, existingFiles, instruction);
  }
}

/**
 * Builds a basic mock refinement without calling the LLM.
 * Prepends a refinement note/banner to App.jsx to visually verify flow works.
 */
function buildFallbackRefinedCode(schema, existingFiles, instruction) {
  const files = (existingFiles || []).map((file) => {
    if (file.filename === "App.jsx" || file.filename === "App.tsx") {
      const banner = `// ─── REFINED SCROLL SCALABILITY NOTE ─────────────────────────────────────────
// Refined for instruction: "${instruction}"
// (Local developer mode fallback: GPT-4o would perform structural updates here)
// ─────────────────────────────────────────────────────────────────────────────\n\n`;
      return {
        ...file,
        content: banner + file.content,
      };
    }
    return file;
  });

  return {
    framework: "react",
    stylingLibrary: "tailwind",
    files: files.length > 0 ? files : [
      {
        filename: "App.jsx",
        language: "jsx",
        content: `import React from 'react';
// Refined for instruction: "${instruction}"
export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-indigo-400">Refined Scaffolding</h1>
      <p className="mt-4 text-slate-300 max-w-md text-center">
        This is a local fallback scaffold refined with instruction: 
        <strong className="text-white"> "${instruction}"</strong>
      </p>
    </div>
  );
}`,
      },
    ],
    entryFile: "App.jsx",
    description: `Refined fallback mockup for instruction: "${instruction}"`,
    componentTree: ["App"],
  };
}

module.exports = refineCodeWithLLM;
