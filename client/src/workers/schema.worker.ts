import { transformCanvasToSchema } from "../lib/transformCanvasToSchema";

self.onmessage = (e: MessageEvent) => {
  const { doc } = e.data;
  try {
    const schema = transformCanvasToSchema(doc);
    self.postMessage({ success: true, schema });
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
