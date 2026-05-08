"use client";

import { useForm, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { formatCurrency } from "@/lib/formatters";
import type { FIREProfile } from "@/types";

interface FormValues {
  targetAnnualExpenses: string;
  safeWithdrawalRate: string;
  expectedReturn: string;
  currentAge: string;
  targetRetirementAge: string;
  additionalRetirementSpend: string;
}

interface Props {
  profile: FIREProfile | null;
  minAnnualSpend: number;
  onSaved: () => void;
}

export function RetirementProfileForm({ profile, minAnnualSpend, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const pct = (v: number) => String(parseFloat((v * 100).toFixed(2)));

  const { register, handleSubmit, control, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      targetAnnualExpenses: "",
      safeWithdrawalRate: "4",
      expectedReturn: "7",
      currentAge: "",
      targetRetirementAge: "",
      additionalRetirementSpend: "0",
    },
  });

  // Populate fields once profile loads from SWR
  useEffect(() => {
    if (profile) {
      reset({
        targetAnnualExpenses: String(profile.targetAnnualExpenses),
        safeWithdrawalRate: pct(profile.safeWithdrawalRate),
        expectedReturn: pct(profile.expectedReturn),
        currentAge: profile.currentAge ? String(profile.currentAge) : "",
        targetRetirementAge: profile.targetRetirementAge ? String(profile.targetRetirementAge) : "",
        additionalRetirementSpend: String(profile.additionalRetirementSpend),
      });
    } else if (minAnnualSpend > 0) {
      setValue("targetAnnualExpenses", String(minAnnualSpend));
    }
  }, [profile, minAnnualSpend, reset, setValue]);

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
          wheelMonthlyRate: profile?.wheelMonthlyRate ?? 0.025,
          additionalRetirementSpend: parseFloat(values.additionalRetirementSpend) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved");
      onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Annual Expenses in Retirement ($)</Label>
          <Controller name="targetAnnualExpenses" control={control} rules={{ required: true }}
            render={({ field }) => (
              <FormattedNumberInput value={field.value} onChange={field.onChange} placeholder="e.g. 60,000" />
            )} />
          {minAnnualSpend > 0 && (
            <button type="button" className="text-xs text-primary hover:underline"
              onClick={() => setValue("targetAnnualExpenses", String(minAnnualSpend))}>
              Use budget minimum: {formatCurrency(minAnnualSpend)}/yr
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Additional Retirement Spending ($)</Label>
          <Controller name="additionalRetirementSpend" control={control}
            render={({ field }) => (
              <FormattedNumberInput value={field.value} onChange={field.onChange} placeholder="0" />
            )} />
          <p className="text-xs text-muted-foreground">Travel, lifestyle upgrades, etc. on top of your budget</p>
        </div>

        <div className="space-y-1.5">
          <Label>Safe Withdrawal Rate (%)</Label>
          <Input type="number" step="0.1" min="1" max="10" placeholder="4" {...register("safeWithdrawalRate")} />
          <p className="text-xs text-muted-foreground">4% = Trinity Study default</p>
        </div>

        <div className="space-y-1.5">
          <Label>Expected Annual Return (%)</Label>
          <Input type="number" step="0.5" min="1" max="20" placeholder="7" {...register("expectedReturn")} />
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

      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Saving…" : "Save Assumptions"}
      </Button>
    </form>
  );
}
