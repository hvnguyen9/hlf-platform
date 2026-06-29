# hlf-platform — Monorepo

HLF suite monorepo. Consolidates all HLF apps and shared infrastructure packages.

---

## Structure

```
apps/
  portal/                Signed-in landing page — cross-app KPI dashboard + profile + admin
  wheel-strat-tracker/   Options wheel strategy tracker
  hlf-bookkeeping/       Finance & trading P&L bookkeeping
  hlf-budgettracker/     Monthly budget tracker + FIRE dashboard
  hlf-website/           Marketing site (static)
  hungvnguyen-site/      Personal portfolio (static)
  # mobile/              Retired 2026-05-20 — Expo app deleted; HLF apps go all-in on mobile-responsive web
  # stock-alerts/        Retired 2026-05-13 — rebuilt inside wheel-strat-tracker, then that module was retired too 2026-06-29

packages/
  auth-db/               Shared User Prisma schema + PrismaClient for auth DB
  ui/                    Shared shadcn/ui components (New York, slate)
  typescript-config/     Shared tsconfig presets (base, nextjs, react-library)
  eslint-config/         Shared ESLint config
```

---

## Apps at a Glance

| App | Port | Brand | DB |
|---|---|---|---|
| `wheel-strat-tracker` | 3000 | Emerald | `ballast` Railway |
| `hlf-bookkeeping` | 3001 | Indigo | `turntable:21201` Railway |
| `hlf-budgettracker` | 3002 | Teal | `shuttle` Railway |
| `portal` | 3003 | HLF green | no DB — reads from `@hlf/auth-db` + cross-app internal APIs |

`stock-alerts` (originally on port 3003) retired 2026-05-13 — alerts were rebuilt inside wheel-strat-tracker, then that in-app module was retired too on 2026-06-29. Portal took over port 3003 so the apps occupy a contiguous range.

`mobile` (Expo + React Native) retired 2026-05-20 — `apps/mobile/` deleted, portal's mobile-JWT mint endpoint (`/api/auth/mobile/session`) and aggregated `/api/portal/summary` deleted, `@hlf/auth-db` mobile-token helpers removed. HLF apps are now mobile-responsive web only. `requireAuth` helper in wheel-tracker still exists but only supports the web session cookie path.

---

## Shared Packages

### `@hlf/auth-db`
Prisma client for the shared auth DB (`AUTH_DATABASE_URL`). Owns the `User` table —
the single source of truth for user identity across the HLF suite. All apps read
and write user records through this package; per-app DBs only store opaque
`userId` strings (no FK constraint).

```ts
import { authPrisma, sharedCookieConfig } from "@hlf/auth-db"
import type { User } from "@hlf/auth-db"
```

`sharedCookieConfig()` — drop into NextAuth `cookies` to enable cross-subdomain
SSO. Returns a config that scopes the session cookie to `.hlfinancialstrategies.com`
in production; returns `undefined` in dev so localhost cookies stay host-only.

Migration: `pnpm --filter @hlf/auth-db db:migrate`

### `@hlf/ui`
Shared shadcn/ui components. New York theme, slate base, Tailwind CSS v4.
Apps import from here instead of duplicating components.

### `@hlf/typescript-config`
- `base.json` — strict TypeScript for library packages
- `nextjs.json` — Next.js apps (ESNext + Bundler resolution)
- `react-library.json` — React component libraries

---

## Cross-app Integration

All apps' internal APIs are guarded by the same `INTERNAL_API_KEY` bearer.

**wheel-strat-tracker** exposes `/api/internal/v1/`:

| Endpoint | Consumer |
|---|---|
| `GET /open-positions?email=` | hlf-wheel-alerts |
| `GET /closed-trades?userId=&from=&to=&portfolioIds=` | hlf-bookkeeping |
| `GET /portfolios?userId=` | hlf-bookkeeping |
| `GET /watchlist?email=` | hlf-wheel-alerts (future) |
| `GET /portal-summary?email=` | portal |
| `GET /trading-summary?userId=&from=&to=` | hlf-bookkeeping |

**hlf-bookkeeping** and **hlf-budgettracker** each expose
`GET /api/internal/v1/portal-summary?email=` — consumed by the portal dashboard.

(wheel-strat-tracker's portal-summary previously carried an alerts inbox;
the alerts module was retired 2026-06-29 and those fields removed.)

## Auth — sign-in identifier

Every app's `CredentialsProvider` takes an `identifier` field that accepts
either a username or an email. If the input contains `@` it's treated as email
(lower-cased before lookup); otherwise it's looked up by username. Same User row
in `@hlf/auth-db` either way.

---

## Environment Variables

| Variable | Scope | Notes |
|---|---|---|
| `AUTH_DATABASE_URL` | All HLF apps | Shared auth DB — `@hlf/auth-db`. Required by every app. |
| `DATABASE_URL` | Per-app | Each app's own Railway DB |
| `NEXTAUTH_SECRET` | All HLF apps | **Must be identical** for cross-app JWT validity |
| `NEXTAUTH_URL` | All HLF apps | Drives `sharedCookieConfig()` — must start with `https://` in prod for SSO cookie to be issued |
| `INTERNAL_API_KEY` | wheel-tracker + consumers | Bearer token for internal API |
| `WHEEL_TRACKER_URL` | bookkeeping, portal | Base URL for internal API calls |
| `BOOKKEEPING_URL` / `BUDGET_TRACKER_URL` | portal | Server-side base URLs for `portal-summary` calls |
| `NEXT_PUBLIC_*_URL` (wheel/bookkeeping/budget) | portal | Client-side launcher links — must be literal `process.env.NEXT_PUBLIC_*` access |
| `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` | wheel-tracker | Alpaca market data (IEX) for `/api/quotes`, `/api/charts`, watchlist |
| ~~`ALERTS_SCAN_SECRET`~~ | wheel-tracker | Dead since 2026-06-29 (alerts module retired) — delete from Vercel + GitHub repo secrets |

---

## Commands

```bash
pnpm build              # build all apps + packages
pnpm dev                # dev all apps in parallel
turbo run build --filter=wheel-strat-tracker   # build one app
pnpm --filter @hlf/auth-db db:migrate          # run auth DB migrations
pnpm --filter @hlf/auth-db db:generate         # regenerate auth Prisma client
```

---

## Migration Status

Apps moved into the monorepo:

- [x] `wheel-strat-tracker` — in monorepo, on shared auth DB. Built a realtime alerts module 2026-05-13; **retired it entirely on 2026-06-29 (v2.21.0)** — little-used and the every-2-min cron scan added load without payoff. All `/alerts/*` pages, `/api/alerts/*` routes, the `.github/workflows/alerts-scan.yml` cron, the 4 alerts DB tables, and the portal alerts inbox were removed.
- [x] `hlf-bookkeeping` — in monorepo, on shared auth DB (v1.4.0 — Tax Reserve Tracker)
- [x] `hlf-budgettracker` — in monorepo, on shared auth DB (v1.2.0 — Month at a Glance dashboard)
- [x] `stock-alerts` (retired) — deleted from monorepo 2026-05-13. Replaced by the new realtime alerts module inside wheel-strat-tracker. `alerts.hlfinancialstrategies.com` subdomain + its Vercel project + its standalone Railway DB to be retired.
- [x] `portal` — in monorepo, deployed at `portal.hlfinancialstrategies.com`. Dashboard launcher + KPI strip + Today queue (expiring trades; the alerts inbox was removed 2026-06-29); profile editor + admin user manager backed by `@hlf/auth-db`.
- [ ] `hlf-website` — not yet moved
- [ ] `hungvnguyen-site` — not yet moved
- [x] `packages/auth-db` — auth DB live (`nozomi.proxy.rlwy.net:14507`); all 4 HLF apps consume it
- [x] Local `User` tables dropped from all 3 original app DBs (2026-05-09)
- [x] `packages/typescript-config` — done
- [x] `packages/eslint-config` — done
- [ ] `packages/ui` — shell only, components to be moved from apps
- [x] `apps/mobile` (retired) — deleted from monorepo 2026-05-20. Mobile coverage now via responsive web in each app.
