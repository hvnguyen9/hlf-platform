import ProtectedPage from "@/features/auth/components/ProtectedPage";
import LadderPageContent from "@/features/summary/components/LadderPageContent";

export default function LadderPage() {
  return (
    <ProtectedPage>
      <LadderPageContent />
    </ProtectedPage>
  );
}
