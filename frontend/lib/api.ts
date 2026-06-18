/**
 * api.ts — thin fetch-based HTTP client wired to the Express backend.
 *
 * • Reads VITE_API_URL from the environment (falls back to http://localhost:4000/api).
 * • Automatically attaches the JWT stored in localStorage.
 * • Throws typed ApiError on non-2xx responses.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

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

  const response = await fetch(`${BASE_URL}${path}`, {
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
