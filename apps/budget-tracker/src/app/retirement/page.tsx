import { PublicRetirementCalculator } from "@/features/retirement-calculator/PublicRetirementCalculator";

export const metadata = {
  title: "Retirement Calculator — HLF Financial Strategies",
  description: "See how Traditional FIRE, Coast FIRE, and Wheel Strategy income compare at your portfolio size. Free, no account needed.",
};

export default function RetirementPage() {
  return <PublicRetirementCalculator />;
}
