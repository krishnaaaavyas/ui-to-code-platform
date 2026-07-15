import { request } from "./client";

export async function generateCodeFromCanvas(payload: { elements: any[]; boardConfig: any }) {
  return request("/ai/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDesignSchema(payload: { elements: any[]; boardConfig: any }) {
  return request("/ai/schema", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refineGeneratedCode(payload: {
  normalizedSchema: any;
  files: any[];
  instruction: string;
  stack?: string;
}) {
  return request("/ai/refine-code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAiStatus() {
  return request("/ai/status");
}
