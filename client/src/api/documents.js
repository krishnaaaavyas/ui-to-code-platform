const API_BASE = "http://localhost:4000/api/documents";

export async function createDocument(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to create document");
  }
  return res.json();
}

export async function listDocuments() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error("Failed to list documents");
  return res.json();
}

export async function getDocument(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch document");
  return res.json();
}

export async function updateDocument(id, payload) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to update document");
  }
  return res.json();
}

export async function deleteDocument(id) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Failed to delete document");
}
// 
