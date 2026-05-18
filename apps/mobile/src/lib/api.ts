// Auth-aware fetch wrapper. `app` selects which app's base URL to hit
// (defaults to portal). The caller injects the token from the auth context.

import { getApiBaseUrl, type AppKey } from "./config";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(
  path: string,
  token: string | null,
  app: AppKey = "portal",
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl(app)}${path}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

async function send<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body: unknown,
  token: string | null,
  app: AppKey,
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl(app)}${path}`, {
    method,
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `Request failed (${res.status})`;
    if (text) {
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch {
        message = text;
      }
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => ({}))) as T;
}

export function apiPost<T>(
  path: string,
  body: unknown,
  token: string | null,
  app: AppKey = "portal",
): Promise<T> {
  return send<T>("POST", path, body, token, app);
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  token: string | null,
  app: AppKey = "portal",
): Promise<T> {
  return send<T>("PATCH", path, body, token, app);
}

export function apiDelete<T>(
  path: string,
  token: string | null,
  app: AppKey = "portal",
): Promise<T> {
  return send<T>("DELETE", path, undefined, token, app);
}
