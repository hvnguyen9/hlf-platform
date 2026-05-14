"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { toast } from "sonner";
import { ALERT_TYPE_LABEL, type AlertConfigType } from "@/lib/alerts/types";

// In-app delivery for fired alerts. Mounted in AppShell, runs only when a
// user is authed. Polls /api/alerts/events?since=<lastSeen> on a short
// interval and pops a sonner toast per new event. Also flashes the browser
// tab title when the window doesn't have focus.

const POLL_INTERVAL_MS = 15_000;

interface EventRow {
  id: string;
  message: string;
  firedAt: string;
  config: {
    id: string;
    type: AlertConfigType;
    tradeId: string | null;
    watchlistTicker: string | null;
  };
}

const fetcher = async (url: string): Promise<{ events: EventRow[] }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`events fetch ${res.status}`);
  return res.json();
};

export function AlertToastsListener() {
  const { status } = useSession();
  const router = useRouter();
  const sinceRef = useRef<string>(new Date().toISOString());
  const baseTitleRef = useRef<string | null>(null);
  const unseenCountRef = useRef(0);

  // Capture the original document title once so we can restore it.
  useEffect(() => {
    if (typeof document !== "undefined" && baseTitleRef.current === null) {
      baseTitleRef.current = document.title.replace(/^\(\d+\)\s*/, "");
    }
  }, []);

  // Clear the title counter the moment the user re-focuses the tab.
  useEffect(() => {
    function onFocus() {
      unseenCountRef.current = 0;
      if (baseTitleRef.current) document.title = baseTitleRef.current;
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") onFocus();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const swrKey =
    status === "authenticated"
      ? `/api/alerts/events?since=${encodeURIComponent(sinceRef.current)}&limit=20`
      : null;

  useSWR<{ events: EventRow[] }>(swrKey, fetcher, {
    refreshInterval: POLL_INTERVAL_MS,
    // The fixed-interval poll already covers freshness. Skipping
    // revalidateOnFocus avoids amplifying request volume when the user
    // tab-switches frequently — a few tabs + active trading was easily
    // 4× the baseline rate.
    revalidateOnFocus: false,
    onSuccess: (data) => {
      const events = data.events ?? [];
      if (events.length === 0) return;

      // events are ordered desc; process oldest-first so toasts appear in
      // chronological order.
      const chrono = [...events].reverse();
      let latest = sinceRef.current;
      for (const ev of chrono) {
        if (ev.firedAt <= latest) continue;
        latest = ev.firedAt;

        toast(ALERT_TYPE_LABEL[ev.config.type], {
          description: ev.message,
          duration: 8000,
          action: ev.config.tradeId
            ? {
                label: "View trade",
                onClick: () => router.push(`/trades/${ev.config.tradeId}`),
              }
            : ev.config.watchlistTicker
              ? {
                  label: "Watchlist",
                  onClick: () => router.push(`/watchlist`),
                }
              : undefined,
        });

        if (document.visibilityState !== "visible") {
          unseenCountRef.current += 1;
          if (baseTitleRef.current) {
            document.title = `(${unseenCountRef.current}) ${baseTitleRef.current}`;
          }
        }
      }
      sinceRef.current = latest;
    },
  });

  return null;
}
