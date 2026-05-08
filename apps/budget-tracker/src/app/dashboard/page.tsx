import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { DashboardContent } from "@/features/dashboard/components/DashboardContent";

export const metadata = { title: "Dashboard — HLF Budget Tracker" };

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <DashboardContent />
    </ProtectedPage>
  );
}
