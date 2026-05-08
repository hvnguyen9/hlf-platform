# HLF Budget Tracker

Personal monthly budget tracker and retirement planning dashboard by HL Financial Strategies. Part of the three-app HLF suite alongside [hlf-bookkeeping](../hlf-bookkeeping) and [wheel-strat-tracker](../wheel-strat-tracker).

---

## Features

### Budgeting
- **Transactions** — log income and expenses with categories, dates, and notes. Color-coded by type.
- **Recurring items** — set rent, salary, subscriptions once and they count in every month automatically. Elevate any transaction to recurring in one click.
- **Budget** — standing monthly spending limits per category with live progress bars. Set once, applies every month until changed.
- **Categories** — 18 default categories auto-created on first login. Add custom categories and mark any as a savings bucket for accurate savings rate tracking.
- **Dashboard** — five KPI cards (Income, Expenses, Saved, Savings Rate, Available), spending donut chart, 12-month trend line, and budget progress.
- **Reports** — monthly comparison bar chart, yearly summary table, and category breakdown for income and expenses.
- **CSV export** — download any month's transactions.

### Retirement Calculator
- **Three scenarios side by side** — Traditional FIRE (4% rule / 25× expenses), Coast FIRE (invest enough now and let it grow), and Wheel FIRE (monthly income from an options portfolio at a target yield rate).
- **Net worth** — live calculation from assets (home, vehicles, cash) + investment accounts − liabilities (mortgage, loans, credit cards).
- **Investment accounts** — track brokerage, 401(k), IRA, Roth IRA, crypto, real estate, and more. Flag accounts as Wheel Strategy accounts so income calculations only use tradeable capital.
- **Budget integration** — retirement calculator reads your monthly budgets and auto-fills the minimum annual spend baseline.
- **Public calculator** — available at `/retirement` with no login required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| Database | PostgreSQL on Railway (shared with hlf-bookkeeping + wheel-strat-tracker) |
| ORM | Prisma 6 |
| Auth | NextAuth v4 — credentials provider, JWT sessions |
| Styling | Tailwind CSS v4 + shadcn/ui (New York, slate) |
| Charts | Recharts |
| Data fetching | SWR |
| Forms | React Hook Form |
| Notifications | Sonner |
| Package manager | pnpm |

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm
- PostgreSQL database

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# Generate Prisma client
pnpm prisma:generate

# Apply database migrations
pnpm prisma:migrate

# Seed default categories for existing users
pnpm seed

# Start development server
pnpm dev
```

### Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Must match across all HLF apps if sharing the same user table |
| `NEXTAUTH_URL` | Production | Set to this app's deployed domain |

---

## Database

All three HLF apps share the same Railway PostgreSQL database and `User` table — a single login works across all apps.

**Never run `prisma db push` or `prisma migrate dev` against the shared database.** Both commands sync the schema destructively and could drop tables used by sibling apps. Always use:

```bash
pnpm prisma:migrate   # runs prisma migrate deploy — additive only
```

New schema changes require writing a raw SQL migration file in `/prisma/migrations/` before deploying.

---

## Deployment

**Vercel build command:** `prisma generate && pnpm build`

Migrations are applied manually before or after deploy:

```bash
pnpm prisma:migrate
```

---

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
├── components/       # Shared UI components and layout
├── data/             # Static data (changelog, default categories)
├── features/         # Feature-sliced modules (dashboard, transactions, fire, etc.)
├── lib/              # Utilities (formatters, FIRE calculations, CSV export)
├── server/           # Prisma client and NextAuth configuration
└── types/            # TypeScript interfaces
```

---

## Related Projects

| App | Description | Theme |
|---|---|---|
| [hlf-bookkeeping](../hlf-bookkeeping) | Income, expenses, and trading P&L tracker | Indigo |
| [wheel-strat-tracker](../wheel-strat-tracker) | Options wheel strategy trading dashboard | Emerald |
| hlf-budgettracker | Monthly budget tracker and retirement calculator | Teal |

---

## License

Private — HL Financial Strategies. Not for public distribution.
