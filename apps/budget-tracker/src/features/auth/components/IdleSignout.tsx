"use client";
import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

type Props = {
  timeoutMs?: number;
  warnMs?: number;
  onWarn?: () => void;
};

export function IdleSignout({ timeoutMs = 30 * 60 * 1000, warnMs = 60 * 1000, onWarn }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (onWarn && timeoutMs > warnMs) {
        warnTimer.current = setTimeout(onWarn, timeoutMs - warnMs);
      }
      timer.current = setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, timeoutMs);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "visibilitychange"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs, warnMs, onWarn]);

  return null;
}
