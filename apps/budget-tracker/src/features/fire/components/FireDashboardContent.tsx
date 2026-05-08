"use client";

import { useFireProfile } from "@/features/fire/hooks/useFireProfile";
import { useInvestments } from "@/features/fire/hooks/useInvestments";
import { NetWorthSection } from "./NetWorthSection";
import { TraditionalFireCard } from "./TraditionalFireCard";
import { CoastFireCard } from "./CoastFireCard";
import { WheelFireCard } from "./WheelFireCard";
import { RetirementProfileForm } from "./RetirementProfileForm";
import { InvestmentsList } from "./InvestmentsList";

export function FireDashboardContent() {
  const { profile, minAnnualSpend, budgetMonthly, mutate: mutateProfile } = useFireProfile();
  const { investments, mutate: mutateInvestments } = useInvestments();

  const totalInvestments = investments.reduce((s, i) => s + i.currentValue, 0);
  const wheelPortfolio = investments.filter((i) => i.isWheelAccount).reduce((s, i) => s + i.currentValue, 0);
  const monthlySavings = 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Retirement</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Three paths to financial independence — pick the one that fits your strategy.
        </p>
      </div>

      {/* Assumptions — always first */}
      <div className="bg-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3">
          {profile ? "Assumptions" : "Set up your retirement assumptions"}
        </h2>
        {!profile && (
          <p className="text-sm text-muted-foreground mb-4">
            Enter your goals to see Traditional FIRE, Coast FIRE, and Wheel FIRE projections side by side.
          </p>
        )}
        <RetirementProfileForm profile={profile} minAnnualSpend={minAnnualSpend} onSaved={mutateProfile} />
      </div>

      {/* Three retirement scenarios */}
      {profile && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Retirement Scenarios</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TraditionalFireCard profile={profile} totalInvestments={totalInvestments} monthlySavings={monthlySavings} />
            <CoastFireCard profile={profile} totalInvestments={totalInvestments} />
            <WheelFireCard profile={profile} totalInvestments={wheelPortfolio} budgetMonthly={budgetMonthly} />
          </div>
        </div>
      )}

      {/* Net Worth + Investments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NetWorthSection />
        <InvestmentsList investments={investments} totalInvestable={totalInvestments} onMutate={mutateInvestments} />
      </div>
    </div>
  );
}
