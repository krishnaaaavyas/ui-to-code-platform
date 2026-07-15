import { request } from "./client";

export async function createDocument(payload: any) {
  return request("/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listDocuments() {
  return request("/documents");
}

export async function getDocument(id: string) {
  return request(`/documents/${id}`);
}

export async function updateDocument(id: string, payload: any) {
  return request(`/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDocument(id: string) {
  return request(`/documents/${id}`, {
    method: "DELETE",
  });
}

export async function listVersions(id: string) {
  return request(`/documents/${id}/versions`);
}

export async function getVersion(id: string, versionId: string) {
  return request(`/documents/${id}/versions/${versionId}`);
}

export async function restoreVersion(id: string, versionId: string) {
  return request(`/documents/${id}/restore/${versionId}`, {
    method: "POST",
  });
}
