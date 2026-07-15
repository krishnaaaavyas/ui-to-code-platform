const { getOpenAIClient } = require("./openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { z } = require("zod");

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
 */
async function refineCodeWithLLM(normalizedSchema, existingFiles, instruction) {
  const client = getOpenAIClient();
  if (!client) {
    console.log("[refineCodeWithLLM] OpenAI API Key absent. Returning refined local fallback.");
    return buildFallbackRefinedCode(normalizedSchema, existingFiles, instruction);
  }

  const systemPrompt = `You are an expert React and Tailwind CSS developer.
You are given:
1. A normalized UI schema (design AST) representing a canvas design.
2. The existing generated React + Tailwind component files.
3. A user instruction describing requested modifications/improvements.

Your job is to refine, update, or rewrite the files to satisfy the user's instructions.`;

  const userMessage = `Here is the normalized UI schema:
\`\`\`json
${JSON.stringify(normalizedSchema, null, 2)}
\`\`\`
Existing files:
\`\`\`json
${JSON.stringify(existingFiles, null, 2)}
\`\`\`
Instructions:
${instruction}`;

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[refineCodeWithLLM] Calling OpenAI API (attempt ${attempt}/${maxAttempts})...`);
      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: zodResponseFormat(GeneratedCodeSchema, "generated_code"),
        temperature: attempt === 1 ? 0.2 : 0.4,
        max_tokens: 8000,
      }, {
        timeout: 30000, // 30s timeout
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Empty content received from OpenAI.");
      }
      return JSON.parse(content);
    } catch (err) {
      console.warn(`[refineCodeWithLLM] Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxAttempts) {
        console.error("[refineCodeWithLLM] All attempts failed. Reverting to fallback builder.");
        return buildFallbackRefinedCode(normalizedSchema, existingFiles, instruction);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

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
