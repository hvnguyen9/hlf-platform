import ProtectedPage from "@/features/auth/components/ProtectedPage";
import { CategoriesPageContent } from "@/features/categories/components/CategoriesPageContent";

export const metadata = { title: "Categories — HLF Budget Tracker" };

export default function CategoriesPage() {
  return (
    <ProtectedPage>
      <CategoriesPageContent />
    </ProtectedPage>
  );
}
