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
  PanelLeftClose,
  PanelLeftOpen,
  ChevronUp,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VersionBadge } from "@/components/layout/VersionBadge";

const COLLAPSED_KEY = "hlf-bookkeeping.sidebar.collapsed";

function WithTooltip({ label, children, enabled }: { label: string; children: React.ReactNode; enabled: boolean }) {
  if (!enabled) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  onClick,
  collapsed,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
  collapsed: boolean;
}) {
  const cls = cn(
    "flex items-center w-full rounded-md text-sm font-medium transition-colors",
    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
  );
  return (
    <WithTooltip label={label} enabled={collapsed}>
      <Link href={href} onClick={onClick} className={cls}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && label}
      </Link>
    </WithTooltip>
  );
}

function UserMenuPopover({
  user,
  initials,
  collapsed,
  onNavigate,
}: {
  user: { firstName?: string; lastName?: string; username?: string } | undefined;
  initials: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const pathname = usePathname();

  if (!user?.username) return null;

  const isDark = mounted && (theme ?? resolvedTheme) === "dark";

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("hlf-bookkeeping.theme", next); } catch {}
    try { document.cookie = `hlf-bookkeeping.theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch {}
  }

  const avatar = (
    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold flex-shrink-0">
      {initials}
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex items-center w-full transition-colors hover:bg-accent/50 group",
          collapsed ? "justify-center px-0 py-3" : "gap-2 px-3 py-3"
        )}>
          {avatar}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-foreground truncate leading-tight">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
              </div>
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} sideOffset={collapsed ? 8 : 0} className="w-56 p-0 shadow-lg">
        <div className="px-3 pt-3 pb-2.5">
          <p className="text-sm font-semibold leading-tight">{user.firstName} {user.lastName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">@{user.username}</p>
        </div>
        <div className="mx-1 h-px bg-border" />
        <div className="p-1">
          <Link href="/settings" onClick={onNavigate} className={cn(
            "flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-colors w-full",
            pathname === "/settings" ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
          )}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </Link>
        </div>
        <div className="mx-1 h-px bg-border" />
        <div className="p-1">
          {mounted && (
            <button onClick={toggleTheme} className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-accent text-foreground w-full text-left">
              {isDark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          )}
        </div>
        <div className="mx-1 h-px bg-border" />
        <div className="p-1">
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-colors hover:bg-destructive/10 text-destructive w-full text-left">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NavContent({ onNavigate, collapsed, onToggleCollapse }: { onNavigate?: () => void; collapsed: boolean; onToggleCollapse: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() || "U";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand + collapse toggle */}
      <div className={cn("flex items-center flex-shrink-0 py-3", collapsed ? "justify-center px-0 py-4" : "pl-3 pr-2")}>
        <Link href="/dashboard" onClick={onNavigate} className={cn("flex items-center gap-2.5", !collapsed && "flex-1 min-w-0")}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
               style={{ background: "linear-gradient(135deg, oklch(0.52 0.24 265), oklch(0.40 0.22 280))" }}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm text-foreground leading-tight whitespace-nowrap">HLF Bookkeeping</span>
              <p className="text-[10px] text-muted-foreground/70 leading-none mt-0.5">HL Financial Strategies</p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button onClick={onToggleCollapse} className="ml-1 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/50 hover:bg-accent hover:text-foreground transition-colors flex-shrink-0" title="Collapse sidebar">
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Separator className="flex-shrink-0" />

      {/* Main nav */}
      <div className={cn("py-3 space-y-0.5 flex-shrink-0", collapsed ? "px-1.5" : "px-2")}>
        <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === "/dashboard"} onClick={onNavigate} collapsed={collapsed} />
        <NavItem href="/records" icon={BookMarked} label="Records" active={pathname.startsWith("/records")} onClick={onNavigate} collapsed={collapsed} />
      </div>

      {/* Wheel Tracker link — shown if NEXT_PUBLIC_WHEEL_TRACKER_URL is set */}
      {process.env.NEXT_PUBLIC_WHEEL_TRACKER_URL && (
        <>
          <Separator className="flex-shrink-0" />
          <div className={cn("py-2 flex-shrink-0", collapsed ? "px-1.5" : "px-2")}>
            <WithTooltip label="Wheel Trade Tracker" enabled={collapsed}>
              <a
                href={process.env.NEXT_PUBLIC_WHEEL_TRACKER_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNavigate}
                className={cn(
                  "flex items-center w-full rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
                )}
              >
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                {!collapsed && "Wheel Tracker"}
              </a>
            </WithTooltip>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Expand button — collapsed only */}
      {collapsed && (
        <>
          <Separator className="flex-shrink-0" />
          <div className="flex flex-col items-center py-1.5 px-1.5 flex-shrink-0">
            <WithTooltip label="Expand sidebar" enabled>
              <button onClick={onToggleCollapse} className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </WithTooltip>
          </div>
        </>
      )}

      {/* User menu */}
      <Separator className="flex-shrink-0" />
      <div className="flex-shrink-0">
        <UserMenuPopover user={user} initials={initials} collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-2 flex-shrink-0 flex items-center justify-between">
          <Link
            href="/changelog"
            onClick={onNavigate}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <VersionBadge />
          </Link>
          <span className="text-[10px] text-muted-foreground/40">© {new Date().getFullYear()} HLF</span>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true"); } catch {}
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch {}
  }

  return (
    <aside className={cn("hidden md:flex md:flex-col bg-background border-r border-border flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out", collapsed ? "md:w-14" : "md:w-60")}>
      <NavContent collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
    </aside>
  );
}

export function MobileTopBar() {
  return (
    <header className="flex items-center px-4 h-14 border-b border-border bg-background flex-shrink-0">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
             style={{ background: "linear-gradient(135deg, oklch(0.52 0.24 265), oklch(0.40 0.22 280))" }}>
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-foreground">HLF Bookkeeping</span>
      </Link>
    </header>
  );
}
