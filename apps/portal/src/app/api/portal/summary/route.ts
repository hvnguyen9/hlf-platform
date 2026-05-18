// Aggregated portal summary for the mobile app. Mirrors what the web dashboard
// computes server-side: parallel calls to each app's portal-summary, plus the
// derived "today" feed. Auth-gated via requireAuth so it accepts either a
// web session cookie or the mobile bearer JWT.

import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import {
  fetchBookkeepingSummary,
  fetchBudgetSummary,
  fetchWheelSummary,
} from "@/lib/clients";
import { APPS } from "@/lib/apps";
import { buildTodayItems } from "@/lib/today-items";
import { getUserTradingPortfolios } from "@/lib/user-settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { user } = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portfolioIds = await getUserTradingPortfolios(user.id);

  const [wheel, bookkeeping, budget] = await Promise.all([
    fetchWheelSummary(user.email, portfolioIds),
    fetchBookkeepingSummary(user.email),
    fetchBudgetSummary(user.email),
  ]);

  const wheelUrl = APPS.find((a) => a.key === "wheel")?.url ?? "";
  const budgetUrl = APPS.find((a) => a.key === "budget")?.url ?? "";

  const todayItems = buildTodayItems({
    wheel: wheel.data,
    bookkeeping: bookkeeping.data,
    budget: budget.data,
    appUrls: { wheel: wheelUrl, budget: budgetUrl },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
    },
    wheel: wheel.data,
    bookkeeping: bookkeeping.data,
    budget: budget.data,
    todayItems,
    errors: {
      wheel: wheel.error,
      bookkeeping: bookkeeping.error,
      budget: budget.error,
    },
  });
}
