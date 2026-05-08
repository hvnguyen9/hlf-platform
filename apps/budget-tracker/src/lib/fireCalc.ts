// ─── Traditional FIRE ────────────────────────────────────────────────────────

export function computeFiNumber(
  targetAnnualExpenses: number,
  safeWithdrawalRate: number
): number {
  if (safeWithdrawalRate <= 0) return 0;
  return targetAnnualExpenses / safeWithdrawalRate;
}

export function computeYearsToFi(params: {
  currentSavings: number;
  monthlyContribution: number;
  annualReturn: number;
  fiNumber: number;
}): number {
  const { currentSavings, monthlyContribution, annualReturn, fiNumber } = params;
  if (fiNumber <= 0 || currentSavings >= fiNumber) return 0;
  if (monthlyContribution <= 0) return Infinity;

  const monthlyRate = annualReturn / 12;
  if (monthlyRate === 0) {
    return (fiNumber - currentSavings) / (monthlyContribution * 12);
  }

  const needed = fiNumber - currentSavings;
  const inner = (needed * monthlyRate) / monthlyContribution + 1;
  if (inner <= 0) return Infinity;

  const months = Math.log(inner) / Math.log(1 + monthlyRate);
  return months / 12;
}

export function computeFireScore(
  currentInvestableAssets: number,
  fiNumber: number
): number {
  if (fiNumber <= 0) return 0;
  return Math.min(100, (currentInvestableAssets / fiNumber) * 100);
}

export function projectFiDate(yearsToFi: number): Date | null {
  if (!isFinite(yearsToFi) || yearsToFi <= 0) return null;
  const date = new Date();
  date.setFullYear(date.getFullYear() + Math.floor(yearsToFi));
  date.setMonth(date.getMonth() + Math.round((yearsToFi % 1) * 12));
  return date;
}

// ─── Coast FIRE ───────────────────────────────────────────────────────────────

/** The amount you need invested TODAY so it grows to fiNumber by retirementAge
 *  without any further contributions. */
export function computeCoastFiNumber(params: {
  fiNumber: number;
  currentAge: number;
  targetRetirementAge: number;
  annualReturn: number;
}): number {
  const { fiNumber, currentAge, targetRetirementAge, annualReturn } = params;
  const years = targetRetirementAge - currentAge;
  if (years <= 0) return fiNumber;
  return fiNumber / Math.pow(1 + annualReturn, years);
}

/** Years until current investments grow to coastFiNumber at the expected return. */
export function computeYearsToCoast(params: {
  currentInvestments: number;
  coastFiNumber: number;
  annualReturn: number;
}): number {
  const { currentInvestments, coastFiNumber, annualReturn } = params;
  if (currentInvestments >= coastFiNumber) return 0;
  if (annualReturn <= 0) return Infinity;
  return Math.log(coastFiNumber / currentInvestments) / Math.log(1 + annualReturn);
}

// ─── Wheel FIRE ───────────────────────────────────────────────────────────────

/** Monthly income generated from a portfolio at a given monthly yield rate. */
export function computeWheelMonthlyIncome(
  portfolioValue: number,
  monthlyRate: number
): number {
  return portfolioValue * monthlyRate;
}

/** Portfolio size required to generate a target monthly income at a given yield. */
export function computeWheelPortfolioTarget(
  targetMonthlyIncome: number,
  monthlyRate: number
): number {
  if (monthlyRate <= 0) return Infinity;
  return targetMonthlyIncome / monthlyRate;
}

/** Coverage %: how much of the monthly budget the current portfolio covers. */
export function computeWheelCoverage(
  portfolioValue: number,
  monthlyRate: number,
  monthlyBudget: number
): number {
  if (monthlyBudget <= 0) return 100;
  const monthlyIncome = computeWheelMonthlyIncome(portfolioValue, monthlyRate);
  return Math.min(100, (monthlyIncome / monthlyBudget) * 100);
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export function computeSavingsRate(
  monthlyIncome: number,
  monthlyExpenses: number
): number {
  if (monthlyIncome <= 0) return 0;
  return Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100);
}
