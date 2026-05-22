"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Eye,
  BookOpen,
  MoreHorizontal,
  Bell,
  Settings,
  Shield,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type TabKey = "summary" | "portfolios" | "watchlist" | "journal" | "more";

function tabForPath(pathname: string): TabKey | null {
  if (pathname === "/summary") return "summary";
  if (pathname.startsWith("/portfolios")) return "portfolios";
  if (pathname === "/watchlist") return "watchlist";
  if (pathname.startsWith("/journal")) return "journal";
  if (
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin")
  ) {
    return "more";
  }
  return null;
}

function TabButton({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href?: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  const cls = cn(
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors",
    active
      ? "text-primary"
      : "text-muted-foreground hover:text-foreground",
  );

  const inner = (
    <>
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} aria-current={active ? "page" : undefined}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-current={active ? "page" : undefined}>
      {inner}
    </button>
  );
}

function MoreSheetContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const user = session?.user;
  const isAdmin = user?.isAdmin ?? false;
  const isDark = mounted && (theme ?? resolvedTheme) === "dark";

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("wheeltracker.theme", next); } catch {}
    try { document.cookie = `wheeltracker.theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch {}
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
      {/* User header */}
      {user && (
        <div className="flex items-center gap-3 px-3 pb-3 border-b border-border">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-emerald-500 text-white grid place-items-center text-sm font-semibold">
              {initials}
            </div>
          )}
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

      {/* Secondary nav */}
      <div className="space-y-0.5 pt-2">
        <Link href="/alerts" onClick={onNavigate} className={linkCls(pathname.startsWith("/alerts"))}>
          <Bell className="h-4 w-4 text-muted-foreground" />
          Alerts
        </Link>
        <Link href="/settings" onClick={onNavigate} className={linkCls(pathname === "/settings")}>
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

      {/* Theme + sign out */}
      <div className="space-y-0.5">
        {mounted && (
          <button
            type="button"
            onClick={() => {
              toggleTheme();
            }}
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
  const active = tabForPath(pathname);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="flex items-stretch h-14">
        <TabButton
          href="/summary"
          icon={LayoutDashboard}
          label="Summary"
          active={active === "summary"}
        />
        <TabButton
          href="/portfolios"
          icon={Briefcase}
          label="Portfolios"
          active={active === "portfolios"}
        />
        <TabButton
          href="/watchlist"
          icon={Eye}
          label="Watchlist"
          active={active === "watchlist"}
        />
        <TabButton
          href="/journal"
          icon={BookOpen}
          label="Journal"
          active={active === "journal"}
        />
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors",
                active === "more"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active === "more" ? "page" : undefined}
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={active === "more" ? 2.4 : 2} />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-0">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-base">More</SheetTitle>
            </SheetHeader>
            <MoreSheetContent onNavigate={() => setMoreOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
