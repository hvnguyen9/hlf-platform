import { Suspense } from "react";
import ProtectedPage from "@/features/auth/components/ProtectedPage";
import LadderPageContent from "@/features/summary/components/LadderPageContent";

export default function LadderPage() {
  return (
    <ProtectedPage>
      <Suspense fallback={<div className="py-16 px-4 sm:px-6">Loading…</div>}>
        <LadderPageContent />
      </Suspense>
    </ProtectedPage>
  );
}
