// Auth-aware fetch wrapper. Auto-injects the bearer header from whatever the
// caller passes as `token`. The auth context owns the token; this module is
// stateless.

import { getApiBaseUrl } from "./config";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiGet<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}
