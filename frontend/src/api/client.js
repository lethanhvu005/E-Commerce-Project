const API_ROOT = process.env.REACT_APP_API_URL || "/api";

const TOKEN_KEY = "commerceos_tokens";

export function getTokens() {
  try {
    return JSON.parse(sessionStorage.getItem(TOKEN_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveTokens(tokens) {
  if (tokens?.access && tokens?.refresh) {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  }
}

export function clearTokens() {
  sessionStorage.removeItem(TOKEN_KEY);
}

function errorMessage(payload, status) {
  if (!payload) return `Yêu cầu thất bại (${status}).`;
  if (typeof payload === "string") return payload;
  if (payload.detail) return payload.detail;
  const first = Object.entries(payload)[0];
  if (!first) return `Yêu cầu thất bại (${status}).`;
  const [field, value] = first;
  return `${field}: ${Array.isArray(value) ? value.join(", ") : value}`;
}

async function refreshAccessToken() {
  const tokens = getTokens();
  if (!tokens?.refresh) return null;

  const response = await fetch(`${API_ROOT}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: tokens.refresh }),
  });
  if (!response.ok) {
    clearTokens();
    return null;
  }
  const nextTokens = await response.json();
  saveTokens(nextTokens);
  return nextTokens.access;
}

export async function apiFetch(path, options = {}, retry = true) {
  const tokens = getTokens();
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (tokens?.access) headers.set("Authorization", `Bearer ${tokens.access}`);

  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  if (response.status === 401 && retry && tokens?.refresh) {
    const access = await refreshAccessToken();
    if (access) return apiFetch(path, options, false);
  }
  if (response.status === 204) return null;

  const type = response.headers.get("content-type") || "";
  const payload = type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(errorMessage(payload, response.status));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path, body) => apiFetch(path, {
    method: "DELETE",
    body: body ? JSON.stringify(body) : undefined,
  }),
};

