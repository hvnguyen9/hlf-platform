# hlf-platform — Monorepo

HLF suite monorepo. Consolidates all HLF apps and shared infrastructure packages.

---

## Structure

```
apps/
  wheel-strat-tracker/   Options wheel strategy tracker (hub — data source for suite)
  hlf-bookkeeping/       Finance & trading P&L bookkeeping
  hlf-budgettracker/     Monthly budget tracker + FIRE dashboard
  hlf-wheel-alerts/      Stock ticker alert system (standalone DB)
  hlf-website/           Marketing site (static)
  hungvnguyen-site/      Personal portfolio (static)

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
| `hlf-wheel-alerts` | 3003 | Violet | `turntable:51073` Railway |

---

## Shared Packages

### `@hlf/auth-db`
Prisma client for the shared auth DB (`AUTH_DATABASE_URL`). Owns the `User` table.
All HLF apps use this for credential verification; subsequent requests use JWTs.

```ts
import { authPrisma } from "@hlf/auth-db"
import type { User } from "@hlf/auth-db"
```

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

wheel-strat-tracker exposes `/api/internal/v1/` (bearer: `INTERNAL_API_KEY`):

| Endpoint | Consumer |
|---|---|
| `GET /open-positions?email=` | hlf-wheel-alerts |
| `GET /closed-trades?userId=&from=&to=&portfolioIds=` | hlf-bookkeeping |
| `GET /portfolios?userId=` | hlf-bookkeeping |
| `GET /watchlist?email=` | hlf-wheel-alerts (future) |

---

## Environment Variables

| Variable | Scope | Notes |
|---|---|---|
| `AUTH_DATABASE_URL` | All HLF apps | Shared auth DB — `@hlf/auth-db` |
| `DATABASE_URL` | Per-app | Each app's own Railway DB |
| `NEXTAUTH_SECRET` | All HLF apps | **Must be identical** for cross-app JWT validity |
| `INTERNAL_API_KEY` | wheel-tracker + consumers | Bearer token for internal API |
| `WHEEL_TRACKER_URL` | bookkeeping, wheel-alerts | Base URL for internal API calls |

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

Apps are being migrated from separate repos. Current state:

- [ ] `wheel-strat-tracker` — not yet moved
- [ ] `hlf-bookkeeping` — not yet moved
- [ ] `hlf-budgettracker` — not yet moved
- [ ] `hlf-wheel-alerts` — not yet moved
- [ ] `hlf-website` — not yet moved
- [ ] `hungvnguyen-site` — not yet moved
- [x] `packages/auth-db` — ready, awaiting auth DB provisioning
- [x] `packages/typescript-config` — done
- [x] `packages/eslint-config` — done
- [ ] `packages/ui` — shell only, components to be moved from apps
