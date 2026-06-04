import { useStore } from "../store/useStore";
import { refreshSession } from "./auth";

const API_BASE = "http://localhost:4000/api/documents";

const getHeaders = () => {
  const token = useStore.getState().accessToken;
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export async function apiRequest(url, options = {}) {
  const headers = getHeaders();
  let res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (res.status === 401) {
    try {
      const refreshData = await refreshSession();
      useStore.getState().setAccessToken(refreshData.accessToken);
      useStore.getState().setUser(refreshData.user);

      const retryHeaders = getHeaders();
      res = await fetch(url, {
        ...options,
        headers: { ...retryHeaders, ...options.headers },
      });
    } catch (refreshErr) {
      useStore.getState().setAccessToken(null);
      useStore.getState().setUser(null);
      throw new Error("Session expired. Please log in again.", { cause: refreshErr });
    }
  }

  return res;
}

export async function createDocument(payload) {
  const res = await apiRequest(API_BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to create document");
  }
  return res.json();
}

export async function listDocuments() {
  const res = await apiRequest(API_BASE);
  if (!res.ok) throw new Error("Failed to list documents");
  return res.json();
}

export async function getDocument(id) {
  const res = await apiRequest(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch document");
  return res.json();
}

export async function updateDocument(id, payload) {
  const res = await apiRequest(`${API_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("conflict");
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to update document");
  }
  return res.json();
}

export async function deleteDocument(id) {
  const res = await apiRequest(`${API_BASE}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Failed to delete document");
}

export async function listVersions(id) {
  const res = await apiRequest(`${API_BASE}/${id}/versions`);
  if (!res.ok) throw new Error("Failed to list versions");
  return res.json();
}

export async function getVersion(id, versionId) {
  const res = await apiRequest(`${API_BASE}/${id}/versions/${versionId}`);
  if (!res.ok) throw new Error("Failed to fetch version");
  return res.json();
}

export async function restoreVersion(id, versionId) {
  const res = await apiRequest(`${API_BASE}/${id}/restore/${versionId}`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Failed to restore version");
  return res.json();
}
