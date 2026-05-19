# hlf-platform — Monorepo

HLF suite monorepo. Consolidates all HLF apps and shared infrastructure packages.

---

## Structure

```
apps/
  portal/                Signed-in landing page — cross-app KPI dashboard + profile + admin
  wheel-strat-tracker/   Options wheel strategy tracker (hub — owns the alerts module since 2026-05-13)
  hlf-bookkeeping/       Finance & trading P&L bookkeeping
  hlf-budgettracker/     Monthly budget tracker + FIRE dashboard
  mobile/                Native mobile app (Expo + React Native) — single gateway, mirrors the portal
  hlf-website/           Marketing site (static)
  hungvnguyen-site/      Personal portfolio (static)
  # stock-alerts/        Retired 2026-05-13 — alerts rebuilt from scratch inside wheel-strat-tracker

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
| `wheel-strat-tracker` | 3000 | Emerald | `ballast` Railway (also hosts alerts module tables since 2026-05-13) |
| `hlf-bookkeeping` | 3001 | Indigo | `turntable:21201` Railway |
| `hlf-budgettracker` | 3002 | Teal | `shuttle` Railway |
| `portal` | 3004 | HLF green | no DB — reads from `@hlf/auth-db` + cross-app internal APIs |
| `mobile` | — | HLF green | no DB — same internal APIs as portal, bearer-JWT auth (planned) |

`stock-alerts` (port 3003) retired 2026-05-13 — alerts now live inside wheel-strat-tracker at `/alerts/*` with Web Push + GitHub Actions cron.

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

The alerts inbox is now part of **wheel-strat-tracker**'s portal-summary
response (`alertsToday`, `alertsThisWeek`, `recentAlerts`) — one fewer
cross-app call since the 2026-05-13 alerts rebuild.

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
| `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` | wheel-tracker (alerts module) | Alpaca market data for the realtime scan |
| `ALERTS_SCAN_SECRET` | wheel-tracker (alerts module) | Bearer token GitHub Actions sends to `/api/alerts/scan` |

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

- [x] `wheel-strat-tracker` — in monorepo, on shared auth DB. Owns the realtime alerts module since 2026-05-13: `/alerts/*` pages, `/api/alerts/*` routes, `/api/alerts/scan` cron endpoint (triggered by GitHub Actions every 2 min during market hours), **in-app toast delivery** via a polling listener mounted in AppShell + tab-title flash for backgrounded windows. Web Push was tried and dropped — see `docs/alerts-module-setup.md`. Inline AlertConfig UI on trade detail + watchlist rows; full configs management + history at `/alerts`.
- [x] `hlf-bookkeeping` — in monorepo, on shared auth DB (v1.3.0)
- [x] `hlf-budgettracker` — in monorepo, on shared auth DB (v1.1.0)
- [x] `stock-alerts` (retired) — deleted from monorepo 2026-05-13. Replaced by the new realtime alerts module inside wheel-strat-tracker. `alerts.hlfinancialstrategies.com` subdomain + its Vercel project + its standalone Railway DB to be retired.
- [x] `portal` — in monorepo, deployed at `portal.hlfinancialstrategies.com`. Dashboard launcher + KPI strip + alerts inbox (now reads alerts data from wheel-tracker's portal-summary); profile editor + admin user manager backed by `@hlf/auth-db`.
- [ ] `hlf-website` — not yet moved
- [ ] `hungvnguyen-site` — not yet moved
- [x] `packages/auth-db` — auth DB live (`nozomi.proxy.rlwy.net:14507`); all 4 HLF apps consume it
- [x] Local `User` tables dropped from all 3 original app DBs (2026-05-09)
- [x] `packages/typescript-config` — done
- [x] `packages/eslint-config` — done
- [ ] `packages/ui` — shell only, components to be moved from apps
- [ ] `apps/mobile` — scaffolded 2026-05-18 (Expo SDK 52 + Expo Router 4 + NativeWind 4 + TanStack Query). Tabbed shell + sign-in stub only; auth + first real screens land next.
