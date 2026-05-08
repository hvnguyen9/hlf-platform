"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={className ?? "p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"}
      aria-label="Toggle theme"
    >
      {mounted
        ? resolvedTheme === "dark"
          ? <Sun className="h-4 w-4" />
          : <Moon className="h-4 w-4" />
        : <div className="h-4 w-4" />}
    </button>
  );
}
