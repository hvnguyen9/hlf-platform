"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

const STORAGE_KEY = "hlf-budgettracker.theme";

export default function ThemeCookieSync() {
  const { theme, resolvedTheme } = useTheme();
  const t = theme ?? resolvedTheme;

  useEffect(() => {
    if (t === "dark" || t === "light") {
      document.cookie = `${STORAGE_KEY}=${t}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
  }, [t]);

  return null;
}
