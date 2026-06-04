const AUTH_BASE = "http://localhost:4000/api/auth";

export async function registerUser(email, password) {
  const res = await fetch(`${AUTH_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to register");
  }
  return res.json();
}

export async function loginUser(email, password) {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to login");
  }
  return res.json();
}

export async function refreshSession() {
  const res = await fetch(`${AUTH_BASE}/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to refresh session");
  }
  return res.json();
}

export async function logoutUser() {
  const res = await fetch(`${AUTH_BASE}/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to logout");
}

export async function getMe(accessToken) {
  const res = await fetch(`${AUTH_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) throw new Error("Failed to get profile");
  return res.json();
}
