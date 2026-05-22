"use client";

import * as React from "react";

export interface HorizontalSwipeOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /** When false, returns empty handlers — handy for gating to mobile only. */
  enabled?: boolean;
  /** Minimum horizontal distance in px before it counts. Default 60. */
  minDistance?: number;
  /** Horizontal-must-exceed-vertical ratio. Default 1.5 (clearly horizontal). */
  minAxisRatio?: number;
  /** Maximum gesture duration in ms (filters slow drags). Default 600. */
  maxDuration?: number;
}

/**
 * Touch-event swipe detector. Only fires when the gesture is clearly
 * horizontal, generous enough to ignore taps, and brisk enough to ignore
 * slow drags (which usually mean the user is interacting with embedded
 * scrolling content). Vertical scroll is unaffected because the hook never
 * calls preventDefault.
 */
export function useHorizontalSwipe(opts: HorizontalSwipeOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    enabled = true,
    minDistance = 60,
    minAxisRatio = 1.5,
    maxDuration = 600,
  } = opts;

  const start = React.useRef<{ x: number; y: number; t: number } | null>(null);

  if (!enabled) {
    return {} as Pick<
      React.HTMLAttributes<HTMLElement>,
      "onTouchStart" | "onTouchEnd"
    >;
  }

  return {
    onTouchStart(e: React.TouchEvent) {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    },
    onTouchEnd(e: React.TouchEvent) {
      if (!start.current) return;
      const end = e.changedTouches[0];
      const dx = end.clientX - start.current.x;
      const dy = end.clientY - start.current.y;
      const dt = Date.now() - start.current.t;
      start.current = null;
      if (
        Math.abs(dx) > minDistance &&
        Math.abs(dx) > Math.abs(dy) * minAxisRatio &&
        dt < maxDuration
      ) {
        if (dx < 0) onSwipeLeft();
        else onSwipeRight();
      }
    },
  };
}
