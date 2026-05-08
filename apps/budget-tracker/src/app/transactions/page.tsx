import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { TransactionsPageContent } from "@/features/transactions/components/TransactionsPageContent";

export const metadata = { title: "Transactions — HLF Budget Tracker" };

export default function TransactionsPage() {
  return (
    <ProtectedPage>
      <TransactionsPageContent />
    </ProtectedPage>
  );
}
