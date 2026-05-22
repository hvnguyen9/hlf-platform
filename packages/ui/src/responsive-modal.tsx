"use client";

import * as React from "react";
import { cn } from "./utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Sheet, SheetContent } from "./sheet";
import { useIsMobile } from "./use-is-mobile";

/**
 * Adaptive modal that renders as a centered Dialog on desktop (md+) and a
 * bottom-anchored Sheet on mobile. Forms-with-many-fields read much better
 * as a slide-up sheet on a phone than as a cramped centered card.
 *
 * API mirrors shadcn's Dialog — drop-in replacement: rename `Dialog` →
 * `ResponsiveModal`, `DialogContent` → `ResponsiveModalContent`, and leave
 * `DialogHeader` / `DialogTitle` / `DialogDescription` / `DialogFooter` as
 * the corresponding `ResponsiveModal*` aliases (they share Radix primitives
 * underneath, so styling carries over).
 *
 * Notes:
 *   • The breakpoint switch unmounts/remounts the underlying primitive when
 *     the viewport crosses md — open-state survives because we pass it
 *     through. Rare in practice (user resizing during a modal session).
 *   • Footer keeps the existing DialogFooter sticky-bottom mobile styling,
 *     which already plays nicely inside a bottom sheet too.
 */

interface ResponsiveModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveModal({ open, onOpenChange, children }: ResponsiveModalProps) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children}
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
}

interface ResponsiveModalContentProps
  extends React.ComponentProps<typeof DialogContent> {
  /** Extra classes applied only on the mobile sheet variant. */
  sheetClassName?: string;
  /** Extra classes applied only on the desktop dialog variant. */
  dialogClassName?: string;
}

export function ResponsiveModalContent({
  className,
  sheetClassName,
  dialogClassName,
  children,
  ...props
}: ResponsiveModalContentProps) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl max-h-[92dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]",
          className,
          sheetClassName,
        )}
        // SheetContent doesn't accept all DialogContent-specific props; only
        // forward the safe overlap.
        {...(props as React.ComponentProps<typeof SheetContent>)}
      >
        {children}
      </SheetContent>
    );
  }
  return (
    <DialogContent className={cn(className, dialogClassName)} {...props}>
      {children}
    </DialogContent>
  );
}

// Header / Title / Description / Footer reuse Dialog's components — they wrap
// shared Radix primitives, so they render correctly inside both Dialog and
// Sheet content.
export const ResponsiveModalHeader = DialogHeader;
export const ResponsiveModalTitle = DialogTitle;
export const ResponsiveModalDescription = DialogDescription;
export const ResponsiveModalFooter = DialogFooter;
