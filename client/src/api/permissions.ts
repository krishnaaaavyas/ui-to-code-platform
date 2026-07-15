import { request } from "./client";

export async function shareDocument(documentId: string, payload: { email: string; role: string }) {
  return request(`/permissions/${documentId}/share`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listPermissions(documentId: string) {
  return request(`/permissions/${documentId}/permissions`);
}

export async function removePermission(documentId: string, permissionId: string) {
  return request(`/permissions/${documentId}/permissions/${permissionId}`, {
    method: "DELETE",
  });
}
