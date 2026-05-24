"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BookMarked,
  Settings,
  LogOut,
  Moon,
  Sun,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  MobileBottomNav as MobileBottomNavPrimitive,
  type BottomNavTab,
} from "@hlf/ui/mobile-bottom-nav";
import { cn } from "@/lib/utils";

/**
 * Bookkeeping config layer over @hlf/ui's MobileBottomNav primitive.
 * Tabs: Dashboard / Records / More (settings, theme, sign out, wheel-tracker link).
 */

function MoreSheetContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const user = session?.user;
  const isDark = mounted && (theme ?? resolvedTheme) === "dark";

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("hlf-bookkeeping.theme", next); } catch {}
    try { document.cookie = `hlf-bookkeeping.theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch {}
  }

  const initials =
    ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() || "U";

  const linkCls = (active: boolean) =>
    cn(
      "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors",
      active
        ? "bg-accent text-accent-foreground"
        : "text-foreground hover:bg-accent/50",
    );

  return (
    <div className="flex flex-col gap-1 pb-[env(safe-area-inset-bottom)]">
      {user && (
        <div className="flex items-center gap-3 px-3 pb-3 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-medium leading-tight truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.username ? `@${user.username}` : user.email}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-0.5 pt-2">
        <Link href="/settings" onClick={onNavigate} className={linkCls(pathname === "/settings")}>
          <Settings className="h-4 w-4 text-muted-foreground" />
          Settings
        </Link>
        {process.env.NEXT_PUBLIC_WHEEL_TRACKER_URL && (
          <a
            href={process.env.NEXT_PUBLIC_WHEEL_TRACKER_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className={linkCls(false)}
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            Wheel Tracker
          </a>
        )}
      </div>

      <div className="mx-3 my-2 h-px bg-border" />

      <div className="space-y-0.5">
        {mounted && (
          <button
            type="button"
            onClick={() => toggleTheme()}
            className={linkCls(false) + " w-full text-left"}
          >
            {isDark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 w-full text-left"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  const tabs: BottomNavTab[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    {
      key: "records",
      label: "Records",
      icon: BookMarked,
      href: "/records",
      match: (p) => p.startsWith("/records"),
    },
    {
      key: "more",
      label: "More",
      icon: MoreHorizontal,
      match: (p) => p.startsWith("/settings"),
      sheet: {
        title: "More",
        content: (close) => <MoreSheetContent onNavigate={close} />,
      },
    },
  ];

  return (
    <MobileBottomNavPrimitive
      tabs={tabs}
      currentPath={pathname}
      LinkComponent={Link}
    />
  );
}
