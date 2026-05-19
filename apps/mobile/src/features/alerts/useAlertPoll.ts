// Background poll for fired alert events, mirroring the web's
// AlertToastsListener. Runs every 15s while the auth context has a token
// and the app is foregrounded. New events arrive as toasts; tapping a
// toast deep-links into the bound entity.

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { apiGet, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TYPE_LABEL } from "./types";
import type { AlertEvent } from "./types";

const POLL_INTERVAL_MS = 15_000;

export function useAlertPoll() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  // Initialize to "now" so we only toast events that arrive AFTER the user
  // signs in — we don't want to spam them with backlog on every cold start.
  const lastSeenRef = useRef<string>(new Date().toISOString());
  const lastSeenLoaded = useRef(false);

  useEffect(() => {
    if (!token) lastSeenLoaded.current = false;
    if (token && !lastSeenLoaded.current) {
      lastSeenRef.current = new Date().toISOString();
      lastSeenLoaded.current = true;
    }
  }, [token]);

  useQuery({
    queryKey: ["alerts", "poll"],
    enabled: !!token,
    refetchInterval: POLL_INTERVAL_MS,
    // Don't poll while app is backgrounded — Expo Go pauses JS anyway, but
    // this also covers the case where the user is in a different tab.
    refetchIntervalInBackground: false,
    queryFn: async () => {
      try {
        const res = await apiGet<{ events: AlertEvent[] }>(
          `/api/alerts/events?since=${encodeURIComponent(lastSeenRef.current)}&limit=20`,
          token,
          "wheel",
        );
        if (res.events.length > 0) {
          // Server returns DESC; iterate in chronological order so the
          // newest toast lands on top in the stack.
          const inChronoOrder = [...res.events].reverse();
          for (const event of inChronoOrder) {
            Toast.show({
              type: "info",
              text1: TYPE_LABEL[event.config.type],
              text2: event.message,
              visibilityTime: 6000,
              onPress: () => {
                Toast.hide();
                if (event.config.tradeId) {
                  router.push(`/wheel/trade/${event.config.tradeId}`);
                } else if (event.config.watchlistTicker) {
                  router.push("/wheel/watchlist");
                } else {
                  router.push("/wheel/alerts");
                }
              },
            });
          }
          lastSeenRef.current = res.events[0]!.firedAt;
          // Refresh the alerts screen's events list if the user is on it.
          qc.invalidateQueries({ queryKey: ["alerts", "events"] });
        }
        return res;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}
