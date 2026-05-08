"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "hlf-budgettracker.theme";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = (theme ?? resolvedTheme) as "light" | "dark" | undefined;
  const isDark = current === "dark";
  const nextTheme = isDark ? "light" : "dark";

  function handleClick() {
    setTheme(nextTheme);
    try { window.localStorage.setItem(STORAGE_KEY, nextTheme); } catch {}
    try { document.cookie = `${STORAGE_KEY}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch {}
  }

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-gray-700" />
      )}
    </button>
  );
}
