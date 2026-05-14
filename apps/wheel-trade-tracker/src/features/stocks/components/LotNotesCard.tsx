"use client";

import * as React from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export interface LotNotesCardProps {
  stockId: string;
  notes: string | null;
  canEdit: boolean;
}

export function LotNotesCard({ stockId, notes, canEdit }: LotNotesCardProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(notes ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!editing) setDraft(notes ?? "");
  }, [notes, editing]);

  async function handleSave() {
    setSaving(true);
    try {
      const trimmed = draft.trim();
      const res = await fetch(`/api/stocks/${encodeURIComponent(stockId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: trimmed === "" ? null : draft }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to save notes (${res.status})`);
      }
      toast.success("Notes saved.");
      setEditing(false);
      await mutate(`/api/stocks/${stockId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save notes";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(notes ?? "");
    setEditing(false);
  }

  if (!canEdit && !notes) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Notes
        </h2>
        {canEdit && !editing ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {notes ? "Edit" : "Add"}
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Add notes for this stock lot — entry rationale, exit plan, news, anything."
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Notes"}
            </Button>
          </div>
        </div>
      ) : notes ? (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{notes}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No notes yet.</p>
      )}
    </Card>
  );
}
