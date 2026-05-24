"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { mutate } from "swr";
import { ArrowLeftRight, Tags } from "lucide-react";
import {
  QuickAddFab as QuickAddFabPrimitive,
  type QuickAddAction,
} from "@hlf/ui/quick-add-fab";
import { TransactionModal } from "@/features/transactions/components/TransactionModal";
import { CategoryModal } from "@/features/categories/components/CategoryModal";

/**
 * Budget-tracker config layer over @hlf/ui's QuickAddFab primitive.
 * Actions: Add Transaction (primary), Add Category. After save, broad-invalidate
 * SWR keys touching transactions / categories / budget summaries.
 */
export function QuickAddFab() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [txOpen, setTxOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const hideOn = ["/", "/login", "/retirement"];
  const hidden = !session || hideOn.includes(pathname);

  const actions: QuickAddAction[] = [
    {
      key: "transaction",
      icon: ArrowLeftRight,
      label: "Add Transaction",
      description: "Log income or expense",
      onSelect: () => setTxOpen(true),
    },
    {
      key: "category",
      icon: Tags,
      label: "Add Category",
      description: "Organize where money goes",
      onSelect: () => setCatOpen(true),
    },
  ];

  function refreshTransactions() {
    void mutate((key) => typeof key === "string" && key.startsWith("/api/transactions"));
    void mutate((key) => typeof key === "string" && key.startsWith("/api/budget"));
    void mutate((key) => typeof key === "string" && key.startsWith("/api/reports"));
  }

  function refreshCategories() {
    void mutate((key) => typeof key === "string" && key.startsWith("/api/categories"));
  }

  return (
    <>
      <QuickAddFabPrimitive
        hidden={hidden}
        actions={actions}
        title="Quick Add"
        description="Log a transaction or set up a new category."
      />

      <TransactionModal
        open={txOpen}
        onClose={() => setTxOpen(false)}
        onSaved={refreshTransactions}
      />
      <CategoryModal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        onSaved={refreshCategories}
      />
    </>
  );
}
