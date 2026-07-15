import { request } from "./client";

export async function registerUser(email: string, password: string) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function loginUser(email: string, password: string) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshSession() {
  return request("/auth/refresh", {
    method: "POST",
  });
}

export async function logoutUser() {
  return request("/auth/logout", {
    method: "POST",
  });
}

export async function getMe() {
  return request("/auth/me");
}
