import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { SettingsPageContent } from "@/features/settings/components/SettingsPageContent";

export const metadata = { title: "Settings — HLF Budget Tracker" };

export default function SettingsPage() {
  return (
    <ProtectedPage>
      <SettingsPageContent />
    </ProtectedPage>
  );
}
