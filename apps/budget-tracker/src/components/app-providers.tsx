"use client";

import { ThemeProvider } from "next-themes";
import { IdleSignout } from "@/features/auth/components/IdleSignout";
import { Toaster, toast } from "sonner";
import ThemeCookieSync from "./layout/ThemeCookieSync";

const THEME_STORAGE_KEY = "hlf-budgettracker.theme";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey={THEME_STORAGE_KEY}
      enableSystem={false}
      disableTransitionOnChange
      themes={["light", "dark"]}
    >
      <ThemeCookieSync />
      <IdleSignout
        timeoutMs={30 * 60 * 1000}
        warnMs={60 * 1000}
        onWarn={() => toast("Auto sign-out in 1 minute due to inactivity")}
      />
      {children}
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );
}
