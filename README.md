# HLF Platform

The HLF suite — apps built for options traders and personal finance,
developed by HL Financial Strategies. Everything lives in this monorepo
and shares a common UI component library, a single sign-on across
subdomains, a unified design system, and a native mobile companion.

---

## The Apps

### Wheel Trade Tracker
`apps/wheel-trade-tracker` · [wheel.hlfinancialstrategies.com](https://wheel.hlfinancialstrategies.com)

A purpose-built dashboard for traders running the Wheel Strategy. Most
brokerage platforms aren't built for Wheel traders — they show positions
but not the full picture. This app fills that gap.

- Track every CSP, covered call, and stock lot across multiple portfolios
- Full position lifecycle: open a CSP, get assigned, write CCs against the
  lot — every step linked
- Cost basis reduction card shows how each covered call lowers your average
  cost
- Capital management with deposit/withdrawal history so your capital base
  always reflects reality
- Watchlist with live prices refreshing every 60 seconds
- Reports, win rate, average hold time, and CSV export
- **Realtime alerts module**: position-aware triggers (profit target,
  assignment risk, roll opportunity, watchlist breach, lot price breach)
  driven by a 2-min GitHub Actions cron during market hours; in-app
  sonner toasts; per-trade and per-watchlist inline configs

---

### Bookkeeping
`apps/bookkeeping` · [books.hlfinancialstrategies.com](https://books.hlfinancialstrategies.com)

Personal income and expense tracking with trading P&L automatically pulled
in from the Wheel Tracker.

- MTD / YTD / All-time KPIs: net income, total income, total expenses,
  trading P&L
- Monthly income vs. expenses chart and category breakdown
- Auto-pulls realized premiums from closed wheel trades — no manual entry
- Tax estimates for federal and California based on the current year's
  numbers

---

### Budget Tracker
`apps/budget-tracker` · [budget.hlfinancialstrategies.com](https://budget.hlfinancialstrategies.com)

Monthly budgeting and retirement planning in one place.

- Log income and expenses with categories, recurring items, and notes
- Standing monthly spending limits with live progress bars
- Dashboard with savings rate, spending donut, and 12-month trend
- Three retirement scenarios side by side: Traditional FIRE, Coast FIRE,
  and Wheel FIRE (income from an options portfolio)
- Net worth tracker with investment accounts, assets, and liabilities
- Public retirement calculator at `/retirement` — no login needed

---

### Portal
`apps/portal` · [portal.hlfinancialstrategies.com](https://portal.hlfinancialstrategies.com)

Signed-in landing page for the suite — the meta-layer that ties the
others together.

- Cross-app KPI dashboard pulling from wheel, bookkeeping, and budget in
  parallel
- Launcher grid to jump into any of the apps
- Profile editing (writes through to `@hlf/auth-db` so changes propagate
  instantly across every subdomain)
- Admin panel: user management + role toggle + password reset
- Aggregated `/api/portal/summary` endpoint that the mobile app reads on
  its Home tab
- Mints the mobile bearer-JWT session via `/api/auth/mobile/session`

---

### Mobile
`apps/mobile`

Native mobile companion focused on the Wheel Tracker. Expo + React Native
+ NativeWind. Single Android + iOS codebase. See
[`apps/mobile/README.md`](./apps/mobile/README.md) for the full stack,
folder structure, and release walkthrough.

- Home tab: cross-app financial snapshot (P&L / business expenses /
  personal expenses / net)
- Wheel tab: portfolio cards with per-portfolio MTD + % deployed,
  expiring-soon section, drill into individual portfolios for trades,
  lots, closed history
- Full write surface: create CSP/CC, close (incl. assignment → stock lot),
  sell shares, add contracts/shares, edit notes
- Alerts: list active configs, recent fires, create inline from any
  trade / lot / watchlist row, in-app toast on new fires (15s background
  poll)
- Watchlist with live quotes + add/remove
- Journal with month picker, day-by-day P&L
- Dark / light theme toggle persisted across launches

Authentication is bearer-JWT signed with the same `NEXTAUTH_SECRET` every
web app already has, so mobile and web hit the same API routes via a
shared `requireAuth` helper.

---

## Shared packages

- **`@hlf/ui`** — shadcn/ui component library used by all four web apps
- **`@hlf/auth-db`** — single User table across the suite; one HLF account,
  SSO across all four subdomains in production; also exports
  `mintMobileToken` / `verifyMobileToken` for the mobile bearer flow
- **`@hlf/eslint-config`** — shared ESLint rules
- **`@hlf/typescript-config`** — shared TypeScript config bases

---

## Local development

```bash
# Install everything from the repo root
pnpm install

# Run all web apps at once (ports 3000, 3001, 3002, 3004)
pnpm dev

# Run just one app
pnpm --filter wheel-strat-tracker dev    # port 3000
pnpm --filter hlf-bookkeeping dev        # port 3001
pnpm --filter hlf-budgettracker dev      # port 3002
pnpm --filter hlf-portal dev             # port 3004
pnpm --filter hlf-mobile dev             # Expo Metro on 8081
```

Each web app needs a `.env.local` with:

```
DATABASE_URL=       # the app's own Railway connection string
AUTH_DATABASE_URL=  # shared HLF auth DB — same value across all apps
NEXTAUTH_SECRET=    # same value across all apps (cross-app JWT validity)
NEXTAUTH_URL=       # e.g. http://localhost:3004 for portal
```

Cross-app integration adds:

```
INTERNAL_API_KEY=        # bearer for the per-app internal APIs
WHEEL_TRACKER_URL=       # the portal + bookkeeping use this for fetches
BOOKKEEPING_URL=         # the portal uses this
BUDGET_TRACKER_URL=      # the portal uses this
NEXT_PUBLIC_*_URL=       # client-side launcher links in the portal
ALPACA_API_KEY=          # market data for the wheel alerts module
ALPACA_SECRET_KEY=
ALERTS_SCAN_SECRET=      # bearer the GitHub Actions cron sends
```

The mobile app's dev base URL derives from Metro's LAN host and per-app
port automatically — no `.env` needed in dev. In production builds, set
`EXPO_PUBLIC_PORTAL_URL`, `EXPO_PUBLIC_WHEEL_URL`,
`EXPO_PUBLIC_BOOKS_URL`, `EXPO_PUBLIC_BUDGET_URL` in EAS env. See
[`apps/mobile/README.md`](./apps/mobile/README.md) for the release path.

---

## Git workflow

Branches are always cut at the repo root — a single branch and PR can
touch one app, multiple apps, or shared packages.

```bash
git checkout -b feature/my-change
# make changes, then
git push -u origin feature/my-change
```

Web apps deploy to Vercel; each app is a separate Vercel project pointing
at this repo with its own root directory, so only changed apps redeploy
on each push to `main`. The mobile app ships via EAS Build (separate
release flow — see the mobile README).

---

## License

Private — HL Financial Strategies. Not for public distribution.
