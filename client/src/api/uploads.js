import { apiRequest } from "./documents";

const API_BASE = "http://localhost:4000/api/uploads";

export async function getPresignedUrl(payload) {
  const res = await apiRequest(`${API_BASE}/presign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to get upload URL");
  }
  return res.json();
}

export async function registerAsset(payload) {
  const res = await apiRequest(`${API_BASE}/assets`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to register asset");
  }
  return res.json();
}

export async function listAssets(documentId) {
  const res = await apiRequest(`${API_BASE}/documents/${documentId}/assets`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to list assets");
  }
  return res.json();
}

export async function uploadFileDirectly(uploadUrl, file, mimeType) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": mimeType,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to upload binary file to storage.");
  }
  return true;
}
