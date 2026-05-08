import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { ReportsPageContent } from "@/features/reports/components/ReportsPageContent";

export const metadata = { title: "Reports — HLF Budget Tracker" };

export default function ReportsPage() {
  return (
    <ProtectedPage>
      <ReportsPageContent />
    </ProtectedPage>
  );
}
