# hlf-mobile

Native mobile app for the HLF suite. Wheel Tracker is the primary surface;
the Home tab is a thin cross-app financial snapshot. Bookkeeping / Budget
have placeholder tabs but no real screens — those workflows live on web.

Built with **Expo + React Native**, ships to Android first (iOS uses the
same codebase when you're ready).

---

## Stack

| Layer | Choice |
|---|---|
| Framework | **Expo SDK 54** + **Expo Router 6** (file-based routing, typed routes) |
| Runtime | **React Native 0.81** with new architecture enabled |
| Language | TypeScript (strict, shares root config) |
| UI | **NativeWind 4** (Tailwind for RN, own Tailwind 3.x install) |
| Server state | **TanStack Query** v5 (queries, mutations, optimistic UI) |
| Auth storage | **expo-secure-store** (OS keystore) |
| Icons | **lucide-react-native** |
| Date picker | **@react-native-community/datetimepicker** |
| Toast notifications | **react-native-toast-message** |
| Skeletons | **react-native** built-in `Animated` (not Reanimated — see Gotchas) |

Theme: dark by default with a system / light / dark toggle in the Profile
tab, persisted in secure-store.

---

## How it talks to the rest of the suite

Mobile uses **bearer-JWT auth**, not the NextAuth cookie session the web
apps use. The token is minted by the portal's `/api/auth/mobile/session`
endpoint and signed with the same `NEXTAUTH_SECRET` every HLF app already
has, so each app can verify it locally via `verifyMobileToken` exported
from `@hlf/auth-db`.

Mobile hits each app's existing user-scoped API routes directly:

- `portal` (3004): `/api/portal/summary` for the Home tab aggregate
- `wheel-trade-tracker` (3000): `/api/trades`, `/api/stocks`, `/api/portfolios`,
  `/api/watchlist`, `/api/quotes`, `/api/journal`, `/api/alerts/*`, etc.

Every wheel route has been switched from `getServerSession` to a
`requireAuth(req)` helper that accepts either the web session cookie or
the mobile bearer JWT — same endpoints serve both clients.

In dev, base URLs are derived from `Constants.expoConfig.hostUri` (Metro's
LAN IP) and the per-app port. In production, the EAS env defines:

```
EXPO_PUBLIC_PORTAL_URL=https://portal.hlfinancialstrategies.com
EXPO_PUBLIC_WHEEL_URL=https://wheel.hlfinancialstrategies.com
EXPO_PUBLIC_BOOKS_URL=https://books.hlfinancialstrategies.com
EXPO_PUBLIC_BUDGET_URL=https://budget.hlfinancialstrategies.com
```

---

## Folder structure

```
app/                                  Expo Router routes
├── _layout.tsx                       Root: AuthProvider, QueryClient,
│                                     ThemeBoot, ThemedStatusBar,
│                                     ThemedToast, alert poller
├── +not-found.tsx
├── (auth)/sign-in.tsx                Modal sign-in
└── (tabs)/                           Bottom tab nav
    ├── _layout.tsx                   Home / Wheel / Books / Budget / Me
    ├── index.tsx                     Home: 4-KPI grid + alerts inbox
    ├── books.tsx                     Placeholder
    ├── budget.tsx                    Placeholder
    ├── me.tsx                        Profile + Appearance toggle + Sign out
    └── wheel/                        Stack — header owned here, not by tabs
        ├── _layout.tsx
        ├── index.tsx                 Overview: KPIs + portfolio cards +
        │                             expiring soon + section links
        ├── watchlist.tsx             Add/remove tickers, live quotes
        ├── journal.tsx               Month picker + stats + day list
        ├── alerts/
        │   ├── index.tsx             Config list + recent fires
        │   └── new.tsx               Create alert (type-scoped form)
        ├── portfolios/
        │   ├── index.tsx             Portfolio list
        │   └── [id]/index.tsx        Detail: KPIs + Open/Closed segments
        ├── trade/
        │   ├── new.tsx               Add CSP/CC modal
        │   └── [id]/
        │       ├── index.tsx         Trade detail
        │       ├── close.tsx         Close (buy back / expired / assigned)
        │       ├── add.tsx           Add contracts (average in)
        │       └── notes.tsx         Edit notes
        └── lot/[id]/
            ├── index.tsx             Lot detail w/ linked trades
            ├── sell.tsx              Sell shares (partial / full)
            ├── add.tsx               Add shares (average up)
            └── notes.tsx             Edit notes

src/
├── features/
│   ├── dashboard/                    Home tab queries + types
│   ├── wheel/                        Trades, lots, watchlist, journal,
│   │   ├── queries.ts                portfolio metrics
│   │   ├── mutations.ts              Create/close/sell, add contracts/shares,
│   │   │                             edit notes, watchlist add/remove
│   │   ├── normalize.ts              Prisma Decimal → number
│   │   ├── format.ts                 money / signedMoney / dteLabel /
│   │   │                             pnlColor / deployedColor / expenseColor
│   │   ├── types.ts
│   │   └── components/               Skeleton, KpiGrid, Segmented, TypeBadge,
│   │                                 StatusBadge, PortfolioCard, ExpiringSoon,
│   │                                 PortfolioFilter, TradesView, LotsView,
│   │                                 WatchlistView, FormField, DateField,
│   │                                 SubmitBar, EmptyState, QueryError
│   └── alerts/
│       ├── queries.ts                List / toggle / delete configs + events
│       ├── useAlertPoll.ts           15s background poll → toast
│       └── types.ts
└── lib/
    ├── api.ts                        apiGet / apiPost / apiPatch / apiDelete
    │                                 with bearer header + ApiError
    ├── auth-context.tsx              AuthProvider + useAuth
    ├── auth-storage.ts               expo-secure-store wrappers
    ├── config.ts                     Per-app base URL resolver
    └── theme.tsx                     ThemeBoot + useTheme
```

---

## Dev loop (Expo Go on Android)

You don't need any paid accounts to develop.

1. Install **Expo Go** from the Play Store on the Android device
2. Make sure the device and the Mac are on the same WiFi
3. Start the relevant servers from the monorepo root:
   ```bash
   pnpm install
   pnpm dev                                # all apps + mobile, OR:
   pnpm --filter hlf-portal dev            # portal alone
   pnpm --filter wheel-strat-tracker dev   # wheel alone
   pnpm --filter hlf-mobile dev            # Metro alone
   ```
4. Scan the QR code Metro prints

Edits hot-reload over LAN. Authentication uses the same identifier+password
the web portal does.

### When Metro acts weird

- **Cache stale after dep changes**: `pnpm --filter hlf-mobile dev -- --clear`
- **"Unable to resolve" on a fresh pnpm-installed package**: the symlink hasn't
  reached the surface — re-run `pnpm install`, then `--clear` Metro
- **Bundle works on Mac LAN but phone errors with "Network request failed"**:
  the API server (wheel, portal, etc) probably isn't bound to `0.0.0.0`. The
  dev scripts already include `--hostname 0.0.0.0`; if you tweak them, keep it

---

## Release paths

Pick the path that matches where you are.

### 1. Android sideload (free, fastest)

For installing on your own device(s) without a Play Store listing.

1. Free **EAS** account at <https://expo.dev>
2. From `apps/mobile/`:
   ```bash
   pnpm dlx eas-cli login              # one-time
   pnpm dlx eas-cli build:configure    # writes eas.json if missing
   pnpm dlx eas-cli build --profile preview --platform android
   ```
3. Wait ~10–15 min for the cloud build
4. Download the `.apk` from the EAS dashboard
5. Sideload to the phone (USB transfer, drag-and-drop, or scan the QR EAS
   provides)

Free tier: 30 builds/month, queue priority below paid.

### 2. Google Play (Internal / closed / production)

Requires Google Play Developer Console: **$25 one-time**.

1. Sign up at <https://play.google.com/console>
2. Create the app entry, fill metadata (icon, screenshots, store listing)
3. In `apps/mobile/app.json`, the `android.package` is already
   `com.hlfinancialstrategies.mobile` — that becomes the Play Store ID
4. Build an `.aab` instead of an `.apk`:
   ```bash
   pnpm dlx eas-cli build --profile production --platform android
   ```
5. `pnpm dlx eas-cli submit --platform android` — uploads to Play Console
6. Promote to internal / closed testing / production from the Play Console

### 3. iOS / TestFlight / App Store

Requires Apple Developer Program: **$99/yr**.

1. Enroll at <https://developer.apple.com/programs>
2. App Store Connect: create the app, bundle ID
   `com.hlfinancialstrategies.mobile` (already set in `app.json`)
3. Build:
   ```bash
   pnpm dlx eas-cli build --profile production --platform ios
   ```
4. EAS handles certificates + provisioning profiles automatically
5. `pnpm dlx eas-cli submit --platform ios` — uploads to App Store Connect
6. Internal testing → TestFlight beta → App Store review → production

### Over-the-air updates

Most JS-only changes can ship without a new native build via `expo-updates`:

```bash
pnpm dlx eas-cli update --branch production --message "Fix X"
```

Users get the update on next app launch. Native dep changes (new package,
config plugin) still need a fresh EAS build.

---

## Gotchas this codebase already worked around

- **Reanimated 4 + Expo Go**: Reanimated 4 needs a custom dev build for its
  worklets TurboModule. Expo Go doesn't ship it cleanly. The `Skeleton`
  component uses RN's built-in `Animated` with `useNativeDriver:true`
  instead — same UI-thread perf, no worklets.
- **Pnpm hoisting**: any package that's only a transitive dep can fail to
  resolve from mobile source. The fix is always to add it as a direct dep
  in this `package.json` so pnpm symlinks it at the surface
  (`react-native-css-interop`, `react-native-toast-message`,
  `react-native-worklets` all needed this).
- **Prisma Decimal serialization**: numeric fields (`avgCost`,
  `contractPrice`, etc.) arrive as strings over JSON, not numbers.
  `src/features/wheel/normalize.ts` coerces them before they reach the
  views so `.toFixed()` doesn't blow up.
- **Wheel tab double header**: a nested Stack inside a Tab renders both
  the outer Tabs header AND the inner Stack header by default. Outer is
  hidden via `headerShown: false` on the Tabs.Screen for `wheel`.
- **Mobile bearer never impersonates**: `requireAuth` on the wheel-tracker
  side honors the `wt-impersonate` cookie for web sessions but skips it
  entirely for mobile bearer tokens — `user.id` from the JWT is the
  truth.
