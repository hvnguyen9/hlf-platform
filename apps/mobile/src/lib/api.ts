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

export async function apiGet<T>(
  path: string,
  token: string | null,
  app: AppKey = "portal",
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl(app)}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}
