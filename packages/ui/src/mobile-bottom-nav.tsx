"use client";

import * as React from "react";
import { cn } from "./utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

/**
 * Generic mobile bottom tab bar — fixed to bottom of viewport, safe-area
 * aware, `md:hidden`. Pass per-app tabs as config; one tab can be designated
 * as an overflow trigger that opens a Sheet with arbitrary content.
 *
 * Framework-agnostic: callers pass a `LinkComponent` (Next's Link, etc.) so
 * the library doesn't pin itself to a router. If omitted, a plain `<a>` is
 * used (you'll lose SPA navigation, so wire one up in app code).
 */

export interface BottomNavLinkTab {
  key: string;
  label: string;
  icon: React.ElementType;
  href: string;
  /** Custom predicate to mark this tab active. Default: exact path match. */
  match?: (currentPath: string) => boolean;
}

export interface BottomNavOverflowTab {
  key: string;
  label: string;
  icon: React.ElementType;
  /** Custom predicate for active state — e.g. routes that live behind the More sheet. */
  match?: (currentPath: string) => boolean;
  sheet: {
    title?: string;
    content: React.ReactNode | ((close: () => void) => React.ReactNode);
  };
}

export type BottomNavTab = BottomNavLinkTab | BottomNavOverflowTab;

export interface MobileBottomNavProps {
  tabs: BottomNavTab[];
  currentPath: string;
  /** Optional Link component — pass `next/link` from app code. */
  LinkComponent?: React.ComponentType<{
    href: string;
    children: React.ReactNode;
    className?: string;
    "aria-current"?: "page" | undefined;
  }>;
  className?: string;
}

function isOverflowTab(t: BottomNavTab): t is BottomNavOverflowTab {
  return (t as BottomNavOverflowTab).sheet != null;
}

function DefaultLink({
  href,
  children,
  ...props
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  "aria-current"?: "page" | undefined;
}) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}

function tabActive(tab: BottomNavTab, currentPath: string): boolean {
  if (tab.match) return tab.match(currentPath);
  if (isOverflowTab(tab)) return false;
  return tab.href === currentPath;
}

function tabClass(active: boolean) {
  return cn(
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors",
    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
  );
}

export function MobileBottomNav({
  tabs,
  currentPath,
  LinkComponent,
  className,
}: MobileBottomNavProps) {
  const Link = LinkComponent ?? DefaultLink;
  // Overflow sheet open state, keyed by tab.key so callers can have multiple
  // overflow tabs in theory (we typically use one).
  const [openKey, setOpenKey] = React.useState<string | null>(null);

  return (
    <nav
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <div className="flex items-stretch h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tabActive(tab, currentPath);

          if (isOverflowTab(tab)) {
            const isOpen = openKey === tab.key;
            const close = () => setOpenKey(null);
            return (
              <Sheet
                key={tab.key}
                open={isOpen}
                onOpenChange={(v) => setOpenKey(v ? tab.key : null)}
              >
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className={tabClass(active)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={active ? 2.4 : 2}
                    />
                    <span className="text-[10px] font-medium leading-none">
                      {tab.label}
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl pb-0">
                  {tab.sheet.title && (
                    <SheetHeader className="pb-2">
                      <SheetTitle className="text-base">
                        {tab.sheet.title}
                      </SheetTitle>
                    </SheetHeader>
                  )}
                  {typeof tab.sheet.content === "function"
                    ? tab.sheet.content(close)
                    : tab.sheet.content}
                </SheetContent>
              </Sheet>
            );
          }

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={tabClass(active)}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10px] font-medium leading-none">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
