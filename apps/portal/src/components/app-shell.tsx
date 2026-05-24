"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  LayoutGrid,
  Settings,
  Shield,
  TrendingUp,
  Wallet,
  Target,
  ExternalLink,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@hlf/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hlf/ui/popover";
import { useTheme } from "next-themes";
import { getLatestVersion } from "@/data/changelog";
import { APPS, getAppUrl, type AppDef } from "@/lib/apps";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const APP_ICONS: Record<AppDef["key"], React.ElementType> = {
  wheel: TrendingUp,
  bookkeeping: Wallet,
  budget: Target,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const firstName = session?.user?.firstName ?? "";
  const lastName = session?.user?.lastName ?? "";
  const email = session?.user?.email ?? "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email;
  const initial = (firstName[0] || email[0] || "?").toUpperCase();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  const internalLink = (href: string, label: string, Icon: React.ElementType) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
        pathname.startsWith(href)
          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );

  const appLink = (app: AppDef) => {
    const Icon = APP_ICONS[app.key];
    return (
      <a
        key={app.key}
        href={getAppUrl(app)}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
      >
        <span
          className="h-5 w-5 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: app.accent }}
        >
          <Icon className="h-3 w-3 text-white" />
        </span>
        <span className="flex-1 truncate">{app.name}</span>
        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      </a>
    );
  };

  const username = session?.user?.username ?? "";
  const isDark = mounted && resolvedTheme === "dark";

  const userMenu = (
    <Popover>
      <PopoverTrigger asChild>
        <button className="group flex items-center w-full gap-2 px-3 py-3 transition-colors hover:bg-accent/50 text-left">
          <div className="h-7 w-7 rounded-full bg-primary grid place-items-center text-xs font-semibold text-primary-foreground shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate leading-tight">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">@{username}</p>
          </div>
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={0}
        className="w-56 p-0 shadow-lg"
      >
        <div className="px-3 pt-3 pb-2.5">
          <p className="text-sm font-semibold leading-tight">{displayName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">@{username}</p>
        </div>

        <div className="mx-1 h-px bg-border" />

        <div className="p-1 space-y-0.5">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-colors w-full",
              pathname.startsWith("/profile")
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-accent",
            )}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Profile &amp; Settings
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-colors w-full",
                pathname.startsWith("/admin")
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent",
              )}
            >
              <Shield className="h-4 w-4 text-muted-foreground" />
              Admin Panel
            </Link>
          )}
        </div>

        <div className="mx-1 h-px bg-border" />

        <div className="p-1">
          {mounted && (
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-accent text-foreground w-full text-left"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground" />
              )}
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          )}
        </div>

        <div className="mx-1 h-px bg-border" />

        <div className="p-1">
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-destructive/10 text-destructive w-full text-left"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const sidebarBody = (
    <>
      <nav className="flex-1 px-2 py-3 space-y-3 overflow-y-auto">
        <div className="space-y-0.5">
          {internalLink("/dashboard", "Dashboard", LayoutDashboard)}
        </div>
        <div>
          <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Apps
          </p>
          <div className="space-y-0.5">{APPS.map(appLink)}</div>
        </div>
      </nav>

      <div className="border-t border-border shrink-0">{userMenu}</div>

      <div className="px-3 py-2 flex-shrink-0 flex items-center justify-between border-t border-border">
        <Link
          href="/changelog"
          className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1.5"
        >
          <Sparkles className="h-3 w-3" />
          <span>{getLatestVersion()}</span>
          <span>· What&apos;s new</span>
        </Link>
        <span className="text-[10px] text-muted-foreground/40">
          © {new Date().getFullYear()} HLF
        </span>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-60 border-r border-border bg-sidebar flex-col shrink-0">
        <div className="px-4 py-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 shrink-0">
              <LayoutGrid className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">HLF Portal</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                HL Financial Strategies
              </p>
            </div>
          </Link>
        </div>
        {sidebarBody}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-border bg-sidebar shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 shrink-0">
              <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="font-semibold text-sm leading-tight truncate">HLF Portal</p>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {mounted ? (
              resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </Button>
        </header>

        <main
          className={cn(
            "flex-1 overflow-y-auto",
            "pb-[calc(theme(spacing.16)+env(safe-area-inset-bottom))] md:pb-0",
          )}
        >
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
