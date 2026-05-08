"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Home, Car, Banknote, Package, CreditCard, GraduationCap, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useAssets } from "@/features/fire/hooks/useAssets";
import { useLiabilities } from "@/features/fire/hooks/useLiabilities";
import { useInvestments } from "@/features/fire/hooks/useInvestments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { BtAsset, BtLiability } from "@/types";

const ASSET_TYPES = [
  { value: "real_estate", label: "Real Estate", icon: Home },
  { value: "vehicle", label: "Vehicle", icon: Car },
  { value: "cash", label: "Cash / Savings", icon: Banknote },
  { value: "other", label: "Other", icon: Package },
];

const LIABILITY_TYPES = [
  { value: "mortgage", label: "Mortgage", icon: Home },
  { value: "car_loan", label: "Car Loan", icon: Car },
  { value: "student_loan", label: "Student Loan", icon: GraduationCap },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "other", label: "Other", icon: TrendingDown },
];

function getAssetIcon(type: string) {
  return ASSET_TYPES.find((t) => t.value === type)?.icon ?? Package;
}
function getLiabilityIcon(type: string) {
  return LIABILITY_TYPES.find((t) => t.value === type)?.icon ?? TrendingDown;
}

type ModalMode = "asset" | "liability";

interface EditState {
  mode: ModalMode;
  id: string | null;
  name: string;
  type: string;
  value: string;
}

export function NetWorthSection() {
  const { assets, mutate: mutateAssets } = useAssets();
  const { liabilities, mutate: mutateLiabilities } = useLiabilities();
  const { investments } = useInvestments();

  const [modal, setModal] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalInvestments = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets + totalInvestments - totalLiabilities;

  function openAdd(mode: ModalMode) {
    const defaultType = mode === "asset" ? "real_estate" : "mortgage";
    setModal({ mode, id: null, name: "", type: defaultType, value: "" });
  }

  function openEdit(mode: ModalMode, item: BtAsset | BtLiability) {
    setModal({
      mode, id: item.id, name: item.name,
      type: item.type,
      value: String(mode === "asset" ? (item as BtAsset).value : (item as BtLiability).balance),
    });
  }

  async function handleSave() {
    if (!modal) return;
    const amount = parseFloat(modal.value);
    if (!modal.name.trim() || isNaN(amount) || amount < 0) {
      toast.error("Enter a name and valid amount"); return;
    }
    setSaving(true);
    try {
      const isAsset = modal.mode === "asset";
      const url = modal.id
        ? `/api/fire/${isAsset ? "assets" : "liabilities"}/${modal.id}`
        : `/api/fire/${isAsset ? "assets" : "liabilities"}`;
      const body = isAsset
        ? { name: modal.name, type: modal.type, value: amount }
        : { name: modal.name, type: modal.type, balance: amount };
      await fetch(url, { method: modal.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      isAsset ? mutateAssets() : mutateLiabilities();
      toast.success(modal.id ? "Updated" : "Added");
      setModal(null);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleDelete(mode: ModalMode, id: string) {
    const isAsset = mode === "asset";
    await fetch(`/api/fire/${isAsset ? "assets" : "liabilities"}/${id}`, { method: "DELETE" });
    isAsset ? mutateAssets() : mutateLiabilities();
    toast.success("Removed");
  }

  function ItemRow({ mode, item }: { mode: ModalMode; item: BtAsset | BtLiability }) {
    const isAsset = mode === "asset";
    const Icon = isAsset ? getAssetIcon(item.type) : getLiabilityIcon(item.type);
    const amount = isAsset ? (item as BtAsset).value : (item as BtLiability).balance;
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 group hover:bg-muted/30 transition-colors">
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-foreground flex-1 truncate">{item.name}</span>
        <span className={cn("text-sm font-semibold tabular-nums", isAsset ? "text-emerald-600" : "text-rose-600")}>
          {isAsset ? "" : "−"}{formatCurrency(amount)}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(mode, item)}><Pencil className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(mode, item.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border overflow-hidden">
        {/* Net Worth header */}
        <div className="px-4 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Net Worth</h2>
            <p className={cn("text-2xl font-bold tabular-nums", netWorth >= 0 ? "text-primary" : "text-destructive")}>
              {formatCompactCurrency(netWorth)}
            </p>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span>Assets <span className="text-emerald-600 font-semibold">{formatCompactCurrency(totalAssets)}</span></span>
            <span>Investments <span className="text-primary font-semibold">{formatCompactCurrency(totalInvestments)}</span></span>
            <span>Liabilities <span className="text-rose-600 font-semibold">{formatCompactCurrency(totalLiabilities)}</span></span>
          </div>
        </div>

        {/* Assets */}
        <div className="border-b">
          <div className="px-4 py-2 flex items-center justify-between bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assets</span>
            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground" onClick={() => openAdd("asset")}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
          {assets.length === 0 ? (
            <p className="px-4 py-2.5 text-xs text-muted-foreground italic">No assets added — home, vehicles, cash, etc.</p>
          ) : (
            assets.map((a) => <ItemRow key={a.id} mode="asset" item={a} />)
          )}
        </div>

        {/* Liabilities */}
        <div>
          <div className="px-4 py-2 flex items-center justify-between bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Liabilities</span>
            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground" onClick={() => openAdd("liability")}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
          {liabilities.length === 0 ? (
            <p className="px-4 py-2.5 text-xs text-muted-foreground italic">No liabilities — mortgage, loans, credit cards, etc.</p>
          ) : (
            liabilities.map((l) => <ItemRow key={l.id} mode="liability" item={l} />)
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      <Dialog open={!!modal} onOpenChange={(v) => !v && setModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {modal?.id ? "Edit" : "Add"} {modal?.mode === "asset" ? "Asset" : "Liability"}
            </DialogTitle>
          </DialogHeader>
          {modal && (
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder={modal.mode === "asset" ? "e.g. Primary Home" : "e.g. Home Mortgage"}
                  value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={modal.type} onValueChange={(v) => setModal({ ...modal, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(modal.mode === "asset" ? ASSET_TYPES : LIABILITY_TYPES).map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{modal.mode === "asset" ? "Current Value ($)" : "Outstanding Balance ($)"}</Label>
                <FormattedNumberInput
                  value={modal.value}
                  onChange={(v) => setModal({ ...modal, value: v })}
                  placeholder="0"
                  autoFocus />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
