import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { FireDashboardContent } from "@/features/fire/components/FireDashboardContent";

export const metadata = { title: "FIRE Dashboard — HLF Budget Tracker" };

export default function FirePage() {
  return (
    <ProtectedPage>
      <FireDashboardContent />
    </ProtectedPage>
  );
}
