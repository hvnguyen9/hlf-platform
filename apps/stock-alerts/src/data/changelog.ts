export interface ChangelogEntry {
  date: string;
  version?: string;
  highlights: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-05-09",
    version: "v2.1.0",
    highlights: [
      "Daily alerts back on — runs once at 5pm ET, Mon–Fri. Pulls bars from Alpaca, scans signals across the full ticker universe, evaluates exits against your live Wheel Tracker positions, and dispatches a single email + Discord digest per user.",
      "Major efficiency rewrite: bar inserts are now batched with createMany (skipping duplicates) instead of per-row upserts; alert dedup is a pre-loaded in-memory Set instead of one DB lookup per signal; the unbounded pg.Pool from the standalone is gone. Same alerts, dramatically less work per run.",
    ],
  },
  {
    date: "2026-05-09",
    version: "v2.0.0",
    highlights: [
      "Joined the HLF Platform — Stock Alerts is now part of the HLF suite. Sign in with the same HLF account that works in Wheel Tracker, Bookkeeping, and Budget Tracker.",
      "Single sign-on across HLF apps in production: signing into one HLF app signs you into all of them.",
      "Behind the scenes: User identity moved to the shared @hlf/auth-db; per-user preferences (notification settings, thresholds, watched portfolios) live in this app's own DB.",
    ],
  },
  {
    date: "2026-05-07",
    version: "v1.2.0",
    highlights: [
      "Portfolio filter — Settings now shows your Wheel Tracker portfolios as toggles. Scope exit alert monitoring to specific portfolios, or leave all on to monitor everything.",
    ],
  },
  {
    date: "2026-05-07",
    version: "v1.1.0",
    highlights: [
      "Live positions from Wheel Tracker — exit signals (Profit Target, Assignment Risk, Roll Opportunity) now evaluate against your real open trades and stock lots pulled live from HLF Wheel Trade Tracker. No manual position entry required.",
      "Positions page — read-only live view of your Wheel Tracker open trades and stock lots, organized by portfolio.",
    ],
  },
  {
    date: "2026-05-06",
    version: "v1.0.0",
    highlights: [
      "Initial release — signal scanning for RSI, SMA 50/200 crosses, swing support/resistance proximity, and volume surges across 30+ wheel-eligible tickers.",
      "Entry alerts: CSP Opportunity, CC Opportunity, Support Break, Resistance Break, Volume Surge, SMA Cross.",
      "Single daily digest — one email and one Discord message per user regardless of how many tickers fire.",
      "Alert deduplication — one alert per ticker per signal type per 24 hours.",
      "Custom thresholds — per-user RSI, proximity, and volume settings.",
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
