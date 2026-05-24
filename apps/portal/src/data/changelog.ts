export interface ChangelogEntry {
  date: string;
  version?: string;
  highlights: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-05-24",
    version: "v1.0.0",
    highlights: [
      "Dashboard is now a real morning briefing — open it first, hit the other apps second.",
      "Wheel Trading card up top: MTD/YTD realized P&L, cash available, cash deployed with a utilization bar, and a concentration warning when any single ticker is more than 30% of your deployed capital.",
      "Next 7 days calendar — option expiries, earnings dates, and ex-dividend dates for every ticker you own or watch, in chronological order.",
      "Today inbox shows positions currently in your alert zones (live state), not just historical alert fires.",
      "Open Positions card combines stock lots and option trades; trades grouped by portfolio.",
      "Watchlist card with live quotes and a bell badge for tickers with active price triggers.",
      "Breakdown windows on Business Expenses, Personal Spend, and MTD Net — see the top contributors that make up each number without leaving the page.",
      "Portfolio selection from settings now scopes the entire Dashboard — pick one account to focus, switch to 'All' for the cross-account picture.",
      "Mobile redesign with a bottom tab bar; the hamburger menu is gone.",
      "Unified font with the rest of the suite for one consistent look across apps.",
    ],
  },
  {
    date: "2026-05-11",
    version: "v0.1.0",
    highlights: [
      "Initial release — HLF Portal as the signed-in landing page across the suite.",
      "App launcher grid linking to Wheel Tracker, Bookkeeping, Budget Tracker, and Stock Alerts.",
      "Cross-app KPI strip — open positions, MTD trading P&L, MTD net, budget remaining, FIRE %, unread alerts.",
      "Alerts inbox surfacing recent signals from Stock Alerts.",
      "SSO via @hlf/auth-db — sign in once, signed in everywhere.",
    ],
  },
];

export function getChangelogSorted(): ChangelogEntry[] {
  return [...changelog].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getLatestVersion(): string {
  const sorted = getChangelogSorted();
  return sorted[0]?.version ?? "v0.0.0";
}
