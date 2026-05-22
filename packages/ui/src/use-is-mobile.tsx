"use client";

import * as React from "react";

const MOBILE_BREAKPOINT_PX = 768;

/**
 * Returns true when the viewport is narrower than the Tailwind `md` breakpoint
 * (768px). SSR-safe: starts false on the server and first paint, then syncs
 * from window.matchMedia after mount. Subscribes to viewport changes so
 * resizing past the breakpoint flips the value.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
