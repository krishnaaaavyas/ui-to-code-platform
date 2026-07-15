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
 * Generates clean React + Tailwind CSS component code from a normalized UI schema.
 * Uses OpenAI structured outputs to guarantee valid JSON-wrapped code artifacts.
 */
async function generateCodeWithLLM(normalizedSchema) {
  const client = getOpenAIClient();
  if (!client) {
    console.log("[generateCodeWithLLM] OpenAI API Key absent. Returning deterministic fallback.");
    return buildFallbackCode(normalizedSchema);
  }

  const systemPrompt = `You are an expert React and Tailwind CSS developer.
Given a normalized UI schema (a design AST representing a canvas design), you will generate clean, production-quality React JSX component code using Tailwind CSS for styling.

Rules:
- Output ONLY valid React functional components.
- Use Tailwind CSS utility classes for ALL styling. No inline styles, no CSS modules.
- Break the design into separate reusable components (e.g., Navbar, HeroSection, Card, Button, InputField).
- The main App.jsx should import and assemble all sub-components.
- Use responsive breakpoints (sm:, md:, lg:) where appropriate.
- Use responsive layouts flex/grid.
- Output App.jsx as entry.`;

  const userMessage = `Generate React + Tailwind CSS code for the following UI schema:
\`\`\`json
${JSON.stringify(normalizedSchema, null, 2)}
\`\`\`
Create a complete, self-contained React application.`;

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[generateCodeWithLLM] Calling OpenAI API (attempt ${attempt}/${maxAttempts})...`);
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
        timeout: 30000, // 30s timeout per call
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Empty content received from OpenAI.");
      }
      return JSON.parse(content);
    } catch (err) {
      console.warn(`[generateCodeWithLLM] Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxAttempts) {
        console.error("[generateCodeWithLLM] All attempts failed. Reverting to fallback builder.");
        return buildFallbackCode(normalizedSchema);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

function buildFallbackCode(schema) {
  const nodes = schema.nodes || [];
  const tokens = schema.designTokens || {};
  const primaryColor = tokens.colors?.primary || "#2563eb";
  const bgColor = schema.page?.backgroundColor || "#ffffff";

  const componentBlocks = nodes.map((node) => {
    if (node.kind === "text") {
      const sizeClass = node.height > 40 ? "text-2xl font-bold" : "text-base";
      return `      <p className="${sizeClass} text-gray-800">${node.text || "Text"}</p>`;
    }
    if (node.kind === "button") {
      return `      <button type="button" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
        ${node.text || "Button"}
      </button>`;
    }
    if (node.kind === "input") {
      return `      <input
        type="text"
        placeholder="${node.placeholder || "Enter text..."}"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />`;
    }
    if (node.kind === "image") {
      return `      <img src="${node.url || "https://placehold.co/400x300"}" alt="design image" className="rounded-lg object-cover" />`;
    }
    return `      <div className="rounded-xl bg-white shadow p-4 flex flex-col gap-2">
        <span className="text-sm">${node.text || node.kind}</span>
      </div>`;
  });

  const appJsx = `import React from 'react';

// Fallback Scaffold (OpenAI Offline / Disabled)
// Design tokens: primary=${primaryColor}, background=${bgColor}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <main className="w-full max-w-5xl mx-auto py-12 px-4 flex flex-col gap-8">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Fallback Local Canvas Scaffold</h1>
${componentBlocks.join("\n\n")}
      </main>
    </div>
  );
}
`;

  return {
    framework: "react",
    stylingLibrary: "tailwind",
    files: [
      {
        filename: "App.jsx",
        language: "jsx",
        content: appJsx,
      },
    ],
    entryFile: "App.jsx",
    description: `Deterministic React + Tailwind scaffold fallback.`,
    componentTree: ["App"],
  };
}

module.exports = generateCodeWithLLM;
