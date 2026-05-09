# HLF Platform

The HLF suite — four apps built for options traders and personal finance, developed by HL Financial Strategies. All four live in this monorepo and share a common UI component library, a single sign-on across subdomains, and a unified design system.

---

## The Apps

### Wheel Trade Tracker
`apps/wheel-trade-tracker` · [wheel.hlfinancialstrategies.com](https://wheel.hlfinancialstrategies.com)

A purpose-built dashboard for traders running the Wheel Strategy. Most brokerage platforms aren't built for Wheel traders — they show positions but not the full picture. This app fills that gap.

- Track every CSP, covered call, and stock lot across multiple portfolios
- Full position lifecycle: open a CSP, get assigned, write CCs against the lot — every step linked
- Cost basis reduction card shows how each covered call lowers your average cost
- Capital management with deposit/withdrawal history so your capital base always reflects reality
- Watchlist with live prices refreshing every 60 seconds
- Reports, win rate, average hold time, and CSV export
- Mobile-friendly throughout

---

### Bookkeeping
`apps/bookkeeping` · [bookkeeping.hlfinancialstrategies.com](https://bookkeeping.hlfinancialstrategies.com)

Personal income and expense tracking with trading P&L automatically pulled in from the Wheel Tracker.

- MTD / YTD / All-time KPIs: net income, total income, total expenses, trading P&L
- Monthly income vs. expenses chart and category breakdown
- Auto-pulls realized premiums from closed wheel trades — no manual entry
- Tax estimates for federal and California based on the current year's numbers

---

### Budget Tracker
`apps/budget-tracker` · [budget.hlfinancialstrategies.com](https://budget.hlfinancialstrategies.com)

Monthly budgeting and retirement planning in one place.

- Log income and expenses with categories, recurring items, and notes
- Standing monthly spending limits with live progress bars
- Dashboard with savings rate, spending donut, and 12-month trend
- Three retirement scenarios side by side: Traditional FIRE, Coast FIRE, and Wheel FIRE (income from an options portfolio)
- Net worth tracker with investment accounts, assets, and liabilities
- Public retirement calculator at `/retirement` — no login needed

---

### Stock Alerts
`apps/stock-alerts` · [alerts.hlfinancialstrategies.com](https://alerts.hlfinancialstrategies.com)

Daily wheel-strategy trade signals delivered to your inbox and Discord. Built for traders already running the Wheel who want a heads-up on what's setting up — without watching charts all day.

- **Entry signals** across a curated wheel-eligible universe: RSI oversold (CSP setup) / overbought (CC setup), price near swing support/resistance, SMA 50/200 crosses, and volume surges
- **Exit signals on your live positions** — pulls open trades from the Wheel Tracker via internal API and flags profit-target hits, assignment risk near expiry, and roll opportunities
- **One digest per day** at 5pm ET — email and Discord. No per-signal spam
- **Per-user thresholds** for RSI, support/resistance proximity, and volume multiplier
- **Portfolio filter** — scope exit alerts to specific Wheel Tracker portfolios, or watch them all
- **Add your own tickers** — anyone can submit new symbols (validated live against Alpaca); admins curate the shared universe

---

## Shared packages

- **`@hlf/ui`** — shadcn/ui component library used by all four apps
- **`@hlf/auth-db`** — single User table across the suite; one HLF account, SSO across all four subdomains in production
- **`@hlf/eslint-config`** — shared ESLint rules
- **`@hlf/typescript-config`** — shared TypeScript config bases

---

## Local development

```bash
# Install everything from the repo root
pnpm install

# Run all four apps at once (ports 3000, 3001, 3002, 3003)
pnpm dev

# Run just one app
pnpm dev --filter=wheel-strat-tracker
pnpm dev --filter=hlf-bookkeeping
pnpm dev --filter=hlf-budgettracker
pnpm dev --filter=hlf-stock-alerts
```

Each app needs a `.env` file. Copy `.env.example` from the app folder and fill in the core values:

```
DATABASE_URL=       # the app's own Railway connection string
AUTH_DATABASE_URL=  # shared HLF auth DB — same value across all four apps
NEXTAUTH_SECRET=    # same value across all four apps (cross-app JWT validity)
NEXTAUTH_URL=       # e.g. http://localhost:3000
```

`stock-alerts` has additional vars for market data and alert delivery (`ALPACA_*`, `ANTHROPIC_API_KEY`, `RESEND_*`, `INTERNAL_API_KEY`, `WHEEL_TRACKER_URL`, `CRON_SECRET`) — see [`apps/stock-alerts/.env.example`](./apps/stock-alerts/.env.example).

---

## Git workflow

Branches are always cut at the repo root — a single branch and PR can touch one app, multiple apps, or shared packages.

```bash
git checkout -b feature/my-change
# make changes, then
git push -u origin feature/my-change
```

Vercel deploys each app independently and only redeploys the apps whose files actually changed.

---

## License

Private — HL Financial Strategies. Not for public distribution.
