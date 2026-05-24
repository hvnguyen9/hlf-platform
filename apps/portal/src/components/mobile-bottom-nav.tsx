"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  LayoutGrid,
  MoreHorizontal,
  Settings,
  Shield,
  LogOut,
  Moon,
  Sun,
  ExternalLink,
  TrendingUp,
  Wallet,
  Target,
} from "lucide-react";
import {
  MobileBottomNav as MobileBottomNavPrimitive,
  type BottomNavTab,
} from "@hlf/ui/mobile-bottom-nav";
import { cn } from "@/lib/utils";
import { APPS, getAppUrl, type AppDef } from "@/lib/apps";

const APP_ICONS: Record<AppDef["key"], React.ElementType> = {
  wheel: TrendingUp,
  bookkeeping: Wallet,
  budget: Target,
};

/**
 * Portal config layer over @hlf/ui's MobileBottomNav primitive.
 * Tabs: Dashboard / Today / Apps (sheet) / More (sheet).
 * Apps tab lists the three HLF apps as launch tiles.
 * More tab holds: Profile, Admin (if admin), theme toggle, sign out.
 */

function AppsSheetContent({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex flex-col gap-1 pb-[env(safe-area-inset-bottom)] pt-2">
      <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Open an app
      </p>
      <div className="space-y-1 px-1">
        {APPS.map((app) => {
          const Icon = APP_ICONS[app.key];
          return (
            <a
              key={app.key}
              href={getAppUrl(app)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavigate}
              className="group flex items-center gap-3 px-2.5 py-3 rounded-md text-sm text-foreground hover:bg-accent/50 transition-colors"
            >
              <span
                className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: app.accent }}
              >
                <Icon className="h-4 w-4 text-white" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium leading-tight">{app.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {app.description}
                </span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

function MoreSheetContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isAdmin = Boolean(session?.user?.isAdmin);
  const firstName = session?.user?.firstName ?? "";
  const lastName = session?.user?.lastName ?? "";
  const email = session?.user?.email ?? "";
  const username = session?.user?.username ?? "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email;
  const initial = (firstName[0] || email[0] || "?").toUpperCase();
  const isDark = mounted && resolvedTheme === "dark";

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  const linkCls = (active: boolean) =>
    cn(
      "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors",
      active
        ? "bg-accent text-accent-foreground"
        : "text-foreground hover:bg-accent/50",
    );

  return (
    <div className="flex flex-col gap-1 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-3 px-3 pb-3 border-b border-border">
        <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-semibold">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-medium leading-tight truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {username ? `@${username}` : email}
          </p>
        </div>
      </div>

      <div className="space-y-0.5 pt-2">
        <Link href="/profile" onClick={onNavigate} className={linkCls(pathname.startsWith("/profile"))}>
          <Settings className="h-4 w-4 text-muted-foreground" />
          Profile &amp; Settings
        </Link>
        {isAdmin && (
          <Link href="/admin" onClick={onNavigate} className={linkCls(pathname.startsWith("/admin"))}>
            <Shield className="h-4 w-4 text-muted-foreground" />
            Admin Panel
          </Link>
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
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
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
      key: "apps",
      label: "Apps",
      icon: LayoutGrid,
      sheet: {
        title: "Apps",
        content: (close) => <AppsSheetContent onNavigate={close} />,
      },
    },
    {
      key: "more",
      label: "More",
      icon: MoreHorizontal,
      match: (p) => p.startsWith("/profile") || p.startsWith("/admin"),
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
