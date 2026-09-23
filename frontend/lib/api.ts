/**
 * api.ts — thin fetch-based HTTP client wired to the Express backend.
 *
 * • Reads VITE_API_URL from the environment (falls back to http://localhost:4000/api).
 * • Automatically attaches the JWT stored in localStorage.
 * • Throws typed ApiError on non-2xx responses.
 */

function getBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || typeof envUrl !== "string" || envUrl.trim() === "") {
    return "/api";
  }

  if (typeof window !== "undefined") {
    // If the browser is on a remote host (e.g. Cloud Run, *.run.app) and envUrl points to localhost,
    // or if envUrl points to obsolete separate ports like 4000/8080/5173,
    // fallback to relative "/api" on the current origin.
    const isRemote = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
    if (
      isRemote ||
      envUrl.includes("localhost:4000") ||
      envUrl.includes("localhost:8080") ||
      envUrl.includes("localhost:5173")
    ) {
      return "/api";
    }
  }

  return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
}

const BASE_URL = getBaseUrl();

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  return localStorage.getItem("authToken");
}

export function setToken(token: string): void {
  localStorage.setItem("authToken", token);
}

export function clearToken(): void {
  localStorage.removeItem("authToken");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${cleanBase}${cleanPath}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body
      ? JSON.stringify(body)
      : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    // A 401 on a request that DID carry a token means the token is invalid/expired.
    // Clear it immediately so it isn't resent on every subsequent call (which would
    // otherwise just keep failing with the same "jwt expired" error indefinitely).
    if (response.status === 401 && token) {
      clearToken();
    }
    throw new ApiError(response.status, payload.error ?? "Request failed");
  }

  // 204 No Content
  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                      => request<T>("GET",    path),
  post:   <T>(path: string, body: unknown)       => request<T>("POST",   path, body),
  put:    <T>(path: string, body: unknown)       => request<T>("PUT",    path, body),
  patch:  <T>(path: string, body?: unknown)      => request<T>("PATCH",  path, body),
  delete: <T>(path: string)                      => request<T>("DELETE", path),
  upload: <T>(path: string, form: FormData)      => request<T>("POST",   path, form, true),
};
