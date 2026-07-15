import { useStore } from "../store/useStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
let isRefreshing = false;

export async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  
  const token = useStore.getState().accessToken;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof Blob) && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !isRefreshing && path !== "/auth/refresh" && path !== "/auth/login") {
    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!refreshRes.ok) {
        throw new Error();
      }

      const refreshData = await refreshRes.json();
      useStore.getState().setAccessToken(refreshData.accessToken);
      useStore.getState().setUser(refreshData.user);

      // Retry request with new token
      headers.set("Authorization", `Bearer ${refreshData.accessToken}`);
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
    } catch (refreshErr) {
      useStore.getState().setAccessToken(null);
      useStore.getState().setUser(null);
      throw new Error("Session expired. Please log in again.");
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Add custom status property to Error for 409 conflict detection
    const errorObj = new Error(err.error || err.message || `Request failed with status ${res.status}`) as any;
    errorObj.status = res.status;
    throw errorObj;
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}
