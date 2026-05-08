"use client";

import { projectFiDate } from "@/lib/fireCalc";
import type { FIREProfile } from "@/types";

interface Props {
  yearsToFi: number | null;
  profile: FIREProfile;
  currentAge: number | null;
}

export function YearsToFiCard({ yearsToFi, profile, currentAge }: Props) {
  const fiDate = yearsToFi !== null && isFinite(yearsToFi) ? projectFiDate(yearsToFi) : null;
  const fiAge = currentAge && yearsToFi !== null && isFinite(yearsToFi)
    ? Math.round(currentAge + yearsToFi)
    : null;

  return (
    <div className="bg-card rounded-xl border p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Years to FI</p>
      {yearsToFi === null ? (
        <p className="text-sm text-muted-foreground">Add monthly savings data to calculate</p>
      ) : !isFinite(yearsToFi) ? (
        <p className="text-sm text-muted-foreground">Need positive monthly savings to reach FI</p>
      ) : yearsToFi <= 0 ? (
        <div>
          <p className="text-2xl font-bold text-emerald-600">FIRE Ready! 🔥</p>
          <p className="text-xs text-muted-foreground">Your investments already cover your target expenses</p>
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold text-foreground">{yearsToFi.toFixed(1)} years</p>
          {fiDate && (
            <p className="text-sm text-muted-foreground">
              Projected: {fiDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              {fiAge && ` (age ${fiAge})`}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Based on {(profile.expectedReturn * 100).toFixed(1)}% annual return
          </p>
        </div>
      )}
    </div>
  );
}
