// API base URL resolution.
//
// Production: set EXPO_PUBLIC_API_BASE_URL in EAS env (e.g.
//   https://portal.hlfinancialstrategies.com).
//
// Dev: we read the LAN IP Metro is serving on (Constants.expoConfig.hostUri
// looks like "192.168.1.42:8081") and assume the Mac runs the portal at
// port 3004 on the same IP. The phone has to be on the same WiFi as the
// Mac for this to work.

import Constants from "expo-constants";

const PORTAL_DEV_PORT = 3004;

function getDevPortalUrl(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.hostUri;

  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  if (!host) return null;
  return `http://${host}:${PORTAL_DEV_PORT}`;
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv;
  const dev = getDevPortalUrl();
  if (dev) return dev;
  throw new Error(
    "API base URL not configured. Set EXPO_PUBLIC_API_BASE_URL or run via Expo CLI so the LAN host is available.",
  );
}
