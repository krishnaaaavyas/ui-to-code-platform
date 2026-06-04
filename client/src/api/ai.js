import { apiRequest } from "./documents";

const AI_BASE = "http://localhost:4000/api/ai";

/**
 * Runs the full design-to-code pipeline on the given canvas elements.
 * @param {{ elements: Array, boardConfig: Object }} payload
 * @returns {Promise<{ success: boolean, pipeline: Object, generated: Object }>}
 */
export async function generateCodeFromCanvas(payload) {
  const res = await apiRequest(AI_BASE + "/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Code generation failed");
  }

  return res.json();
}

/**
 * Returns only the intermediate UI schema + design tokens (no LLM code generation).
 * @param {{ elements: Array, boardConfig: Object }} payload
 * @returns {Promise<{ rawSchema: Object, tokens: Object }>}
 */
export async function getDesignSchema(payload) {
  const res = await apiRequest(AI_BASE + "/schema", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Schema extraction failed");
  }

  return res.json();
}
