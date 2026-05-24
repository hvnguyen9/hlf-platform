import { auth } from "@/server/auth/auth";
import {
  fetchBookkeepingSummary,
  fetchBudgetSummary,
  fetchWheelSummary,
} from "@/lib/clients";
import { APPS } from "@/lib/apps";
import { buildTodayItems } from "@/lib/today-items";
import { getUserTradingPortfolios } from "@/lib/user-settings";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const userId = session?.user?.id ?? "";
  const firstName = session?.user?.firstName ?? "";

  const portfolioIds = userId ? await getUserTradingPortfolios(userId) : undefined;

  const [wheel, bookkeeping, budget] = await Promise.all([
    fetchWheelSummary(email, portfolioIds),
    fetchBookkeepingSummary(email),
    fetchBudgetSummary(email),
  ]);

  const wheelUrl = APPS.find((a) => a.key === "wheel")?.url ?? "";

  const todayItems = buildTodayItems({
    wheel: wheel.data,
    appUrls: { wheel: wheelUrl },
  });

  return (
    <DashboardView
      firstName={firstName}
      wheel={wheel.data}
      bookkeeping={bookkeeping.data}
      budget={budget.data}
      todayItems={todayItems}
      errors={{
        wheel: wheel.error,
        bookkeeping: bookkeeping.error,
        budget: budget.error,
      }}
    />
  );
}
