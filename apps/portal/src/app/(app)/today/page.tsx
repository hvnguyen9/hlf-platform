import { auth } from "@/server/auth/auth";
import { fetchWheelSummary } from "@/lib/clients";
import { APPS } from "@/lib/apps";
import { buildTodayItems } from "@/lib/today-items";
import { getUserTradingPortfolios } from "@/lib/user-settings";
import { TodayView } from "./today-view";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const userId = session?.user?.id ?? "";
  const firstName = session?.user?.firstName ?? "";

  const portfolioIds = userId ? await getUserTradingPortfolios(userId) : undefined;

  const wheel = await fetchWheelSummary(email, portfolioIds);

  const wheelUrl = APPS.find((a) => a.key === "wheel")?.url ?? "";

  const items = buildTodayItems({
    wheel: wheel.data,
    appUrls: { wheel: wheelUrl },
  });

  return (
    <TodayView
      firstName={firstName}
      items={items}
      errors={{ wheel: wheel.error }}
    />
  );
}
