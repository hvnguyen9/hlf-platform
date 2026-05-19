// Per-app base URL resolution.
//
// Production: set EXPO_PUBLIC_{APP}_URL in EAS env, e.g.:
//   EXPO_PUBLIC_PORTAL_URL=https://portal.hlfinancialstrategies.com
//   EXPO_PUBLIC_WHEEL_URL=https://wheel.hlfinancialstrategies.com
//   EXPO_PUBLIC_BOOKS_URL=https://books.hlfinancialstrategies.com
//   EXPO_PUBLIC_BUDGET_URL=https://budget.hlfinancialstrategies.com
//
// Dev: derive Metro's LAN IP from Constants.expoConfig.hostUri and assume
// the Mac runs each app at its standard port. Phone must be on the same WiFi.
//
// Each NEXT_PUBLIC_* must be read by its literal name so Expo can inline it.

import Constants from "expo-constants";

const DEV_PORTS = {
  portal: 3004,
  wheel: 3000,
  books: 3001,
  budget: 3002,
} as const;

export type AppKey = keyof typeof DEV_PORTS;

function getDevHost(): string | null {
  // expo-constants' ExpoGoConfig type stopped exposing hostUri publicly
  // but it's still present at runtime in Expo Go. Cast to unknown→shape
  // to avoid the type error without losing the runtime fallback.
  const goConfig = Constants.expoGoConfig as { hostUri?: string } | null;
  const hostUri = Constants.expoConfig?.hostUri ?? goConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  return host ?? null;
}

export function getApiBaseUrl(app: AppKey = "portal"): string {
  const prodEnv = {
    portal: process.env.EXPO_PUBLIC_PORTAL_URL,
    wheel: process.env.EXPO_PUBLIC_WHEEL_URL,
    books: process.env.EXPO_PUBLIC_BOOKS_URL,
    budget: process.env.EXPO_PUBLIC_BUDGET_URL,
  }[app];

  if (prodEnv) return prodEnv;

  const host = getDevHost();
  if (host) return `http://${host}:${DEV_PORTS[app]}`;

  throw new Error(
    `API base URL not configured for "${app}". Set EXPO_PUBLIC_${app.toUpperCase()}_URL or run via Expo CLI.`,
  );
}
