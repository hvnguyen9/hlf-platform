import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { BudgetPageContent } from "@/features/budget/components/BudgetPageContent";

export const metadata = { title: "Budget — HLF Budget Tracker" };

export default function BudgetPage() {
  return (
    <ProtectedPage>
      <BudgetPageContent />
    </ProtectedPage>
  );
}
