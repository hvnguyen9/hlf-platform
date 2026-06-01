"use client";

import * as React from "react";
import { Plus, ChevronRight } from "lucide-react";
import { cn } from "./utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./sheet";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * Generic floating quick-add control with viewport-responsive surfaces:
 *   • Mobile (<md): floating "+" button anchored bottom-right above the safe
 *     area. Opens a bottom sheet with large tap-target action tiles.
 *   • Desktop (md+): floating "+" button anchored bottom-right. Opens a
 *     compact popover with list-row choices.
 *
 * Per-app config:
 *   - `actions`: the choices the user can pick (Add Stock, Add Transaction, …)
 *   - `header`: optional content rendered above the actions (e.g. a context
 *     picker like "which portfolio / month / account")
 *   - `title` / `description`: shown in the sheet/popover header
 *   - `emptyState`: rendered instead of actions when actions[].length === 0
 *
 * The component manages its own open state and the FAB chrome. App code
 * provides the actions and any prerequisite UI (e.g. modals it opens).
 */

export interface QuickAddAction {
  key: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  onSelect: () => void;
  disabled?: boolean;
  /** "destructive" tints the icon and label rose — use for close/sell actions. */
  variant?: "default" | "destructive";
  /** Render a divider above this item (desktop popover only). */
  divider?: boolean;
}

export interface QuickAddFabProps {
  actions: QuickAddAction[];
  header?: React.ReactNode;
  title?: string;
  description?: string;
  emptyState?: React.ReactNode;
  /** Hide the FAB entirely — e.g. on auth pages. */
  hidden?: boolean;
  /** Override the bottom-right offset on the mobile FAB. */
  mobileBottomOffsetClass?: string;
  /** Override the bottom-right offset on the desktop FAB. */
  desktopBottomOffsetClass?: string;
  /** aria-label for the trigger buttons. Default "Quick add". */
  ariaLabel?: string;
  /** Override the FAB icon. Defaults to Plus. */
  fabIcon?: React.ElementType;
}

// Shared chrome class. NOTE: deliberately no `display` utility here —
// the mobile and desktop triggers each set their own (`flex md:hidden`
// vs `hidden md:flex`), and an extra `flex` here would collide.
const FAB_SKIN =
  "rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl items-center justify-center transition-all active:scale-95";

function ActionTile({
  action,
  tileVariant,
}: {
  action: QuickAddAction;
  tileVariant: "card" | "row";
}) {
  const Icon = action.icon;
  const disabled = !!action.disabled;
  const isDestructive = action.variant === "destructive";

  if (tileVariant === "card") {
    // Mobile sheet — large tap target
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && action.onSelect()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-5 transition-colors",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : isDestructive
              ? "hover:bg-destructive/10 active:scale-[0.98]"
              : "hover:bg-accent active:scale-[0.98]",
        )}
      >
        <Icon className={cn("h-6 w-6", isDestructive ? "text-destructive" : "text-primary")} />
        <span className={cn("font-semibold text-sm", isDestructive && "text-destructive")}>
          {action.label}
        </span>
        {action.description && (
          <span className="text-[11px] text-muted-foreground text-center leading-tight">
            {action.description}
          </span>
        )}
      </button>
    );
  }

  // Desktop popover — compact list row
  return (
    <>
      {action.divider && <div className="mx-2 my-1 border-t" />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && action.onSelect()}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
          disabled
            ? "opacity-50 cursor-not-allowed text-muted-foreground"
            : isDestructive
              ? "hover:bg-destructive/10 text-destructive"
              : "hover:bg-accent text-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", isDestructive ? "text-destructive" : "text-primary")} />
        <span className="flex-1 text-left">
          <span className="block font-medium">{action.label}</span>
          {action.description && (
            <span className={cn("block text-[11px]", isDestructive ? "text-destructive/70" : "text-muted-foreground")}>
              {action.description}
            </span>
          )}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      </button>
    </>
  );
}

export function QuickAddFab(props: QuickAddFabProps) {
  const {
    actions,
    header,
    title = "Quick Add",
    description,
    emptyState,
    hidden,
    mobileBottomOffsetClass = "bottom-[calc(theme(spacing.16)+env(safe-area-inset-bottom))]",
    desktopBottomOffsetClass = "bottom-6 right-6",
    ariaLabel = "Quick add",
    fabIcon: FabIcon = Plus,
  } = props;

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [desktopOpen, setDesktopOpen] = React.useState(false);

  if (hidden) return null;

  const handleAction = (a: QuickAddAction) => {
    setMobileOpen(false);
    setDesktopOpen(false);
    a.onSelect();
  };

  const wrappedActions = actions.map((a) => ({
    ...a,
    onSelect: () => handleAction(a),
  }));

  const hasActions = actions.length > 0;

  return (
    <>
      {/* ── Mobile FAB → bottom sheet ── */}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setMobileOpen(true)}
        className={cn(
          "flex md:hidden fixed right-4 z-40 h-14 w-14",
          mobileBottomOffsetClass,
          FAB_SKIN,
        )}
      >
        <FabIcon className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>

          {header && <div className="pt-2">{header}</div>}

          {hasActions ? (
            <div
              className={cn(
                "grid gap-3 pt-4",
                wrappedActions.length === 1 ? "grid-cols-1" : "grid-cols-2",
              )}
            >
              {wrappedActions.map((a) => (
                <ActionTile key={a.key} action={a} tileVariant="card" />
              ))}
            </div>
          ) : (
            <div className="pt-3">{emptyState}</div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Desktop FAB → popover anchored to itself ── */}
      <Popover open={desktopOpen} onOpenChange={setDesktopOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "hidden md:flex fixed z-40 h-12 w-12",
              desktopBottomOffsetClass,
              FAB_SKIN,
            )}
          >
            <FabIcon className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" sideOffset={12} className="w-72 p-0">
          <div className="px-3 py-2 border-b">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
          </div>

          {header && <div className="border-b">{header}</div>}

          {hasActions ? (
            <div className="p-1">
              {wrappedActions.map((a) => (
                <ActionTile key={a.key} action={a} tileVariant="row" />
              ))}
            </div>
          ) : (
            <div className="p-3 text-xs text-muted-foreground">{emptyState}</div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
