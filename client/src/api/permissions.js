import { apiRequest } from "./documents";

const API_BASE = "http://localhost:4000/api/permissions";

export async function shareDocument(documentId, payload) {
  const res = await apiRequest(`${API_BASE}/${documentId}/share`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to share document");
  }
  return res.json();
}

export async function listPermissions(documentId) {
  const res = await apiRequest(`${API_BASE}/${documentId}/permissions`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to list permissions");
  }
  return res.json();
}

export async function removePermission(documentId, permissionId) {
  const res = await apiRequest(`${API_BASE}/${documentId}/permissions/${permissionId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to remove permission");
  }
  return res.json();
}
