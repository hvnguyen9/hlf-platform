"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { mutate } from "swr";
import { Receipt } from "lucide-react";
import {
  QuickAddFab as QuickAddFabPrimitive,
  type QuickAddAction,
} from "@hlf/ui/quick-add-fab";
import { AddEntryModal } from "@/features/bookkeeping/components/AddEntryModal";

/**
 * Bookkeeping config layer over @hlf/ui's QuickAddFab primitive.
 * Only action is "Add Entry" — opens AddEntryModal. After save, invalidate
 * all /api/bookkeeping queries so Dashboard / Records re-fetch.
 */
export function QuickAddFab() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [entryOpen, setEntryOpen] = useState(false);

  const hideOn = ["/", "/login"];
  const hidden = !session || hideOn.includes(pathname);

  const actions: QuickAddAction[] = [
    {
      key: "entry",
      icon: Receipt,
      label: "Add Entry",
      description: "Income or expense record",
      onSelect: () => setEntryOpen(true),
    },
  ];

  function handleSuccess() {
    void mutate(
      (key) => typeof key === "string" && key.startsWith("/api/bookkeeping"),
    );
    void mutate(
      (key) => typeof key === "string" && key.startsWith("/api/trading-summary"),
    );
  }

  return (
    <>
      <QuickAddFabPrimitive
        hidden={hidden}
        actions={actions}
        title="Quick Add"
        description="Log a new income or expense entry."
      />

      <AddEntryModal
        open={entryOpen}
        onOpenChange={setEntryOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
