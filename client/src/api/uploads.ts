import { request } from "./client";

export async function getPresignedUrl(payload: { filename: string; mimeType: string; documentId: string }) {
  return request("/uploads/presign", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerAsset(payload: {
  documentId: string;
  key: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}) {
  return request("/uploads/assets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listAssets(documentId: string) {
  return request(`/uploads/documents/${documentId}/assets`);
}

export async function uploadFileDirectly(uploadUrl: string, file: File, mimeType: string) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": mimeType,
    },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to upload binary file to storage.");
  }
  return true;
}
