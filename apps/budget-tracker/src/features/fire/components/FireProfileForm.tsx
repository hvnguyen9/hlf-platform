"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FIREProfile } from "@/types";

interface FormValues {
  targetAnnualExpenses: string;
  safeWithdrawalRate: string;
  expectedReturn: string;
  currentAge: string;
  targetRetirementAge: string;
}

interface Props {
  profile: FIREProfile | null;
  onSaved: () => void;
}

export function FireProfileForm({ profile, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      targetAnnualExpenses: profile ? String(profile.targetAnnualExpenses) : "",
      safeWithdrawalRate: profile ? String(profile.safeWithdrawalRate * 100) : "4",
      expectedReturn: profile ? String(profile.expectedReturn * 100) : "7",
      currentAge: profile?.currentAge ? String(profile.currentAge) : "",
      targetRetirementAge: profile?.targetRetirementAge ? String(profile.targetRetirementAge) : "",
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch("/api/fire/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAnnualExpenses: parseFloat(values.targetAnnualExpenses),
          safeWithdrawalRate: parseFloat(values.safeWithdrawalRate) / 100,
          expectedReturn: parseFloat(values.expectedReturn) / 100,
          currentAge: values.currentAge ? parseInt(values.currentAge) : null,
          targetRetirementAge: values.targetRetirementAge ? parseInt(values.targetRetirementAge) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("FIRE profile saved");
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Target Annual Expenses ($)</Label>
          <Input type="number" step="1000" placeholder="e.g. 60000" {...register("targetAnnualExpenses", { required: true })} />
          <p className="text-xs text-muted-foreground">How much you need per year in retirement</p>
        </div>
        <div className="space-y-1.5">
          <Label>Safe Withdrawal Rate (%)</Label>
          <Input type="number" step="0.1" min="1" max="10" placeholder="4" {...register("safeWithdrawalRate")} />
          <p className="text-xs text-muted-foreground">Typically 4% (Trinity Study)</p>
        </div>
        <div className="space-y-1.5">
          <Label>Expected Annual Return (%)</Label>
          <Input type="number" step="0.5" min="1" max="20" placeholder="7" {...register("expectedReturn")} />
          <p className="text-xs text-muted-foreground">Long-term portfolio growth rate</p>
        </div>
        <div className="space-y-1.5">
          <Label>Current Age</Label>
          <Input type="number" min="18" max="100" placeholder="e.g. 35" {...register("currentAge")} />
        </div>
        <div className="space-y-1.5">
          <Label>Target Retirement Age</Label>
          <Input type="number" min="18" max="100" placeholder="e.g. 50" {...register("targetRetirementAge")} />
        </div>
      </div>
      <Button type="submit" disabled={loading} size="sm">
        {loading ? "Saving…" : "Save Assumptions"}
      </Button>
    </form>
  );
}
