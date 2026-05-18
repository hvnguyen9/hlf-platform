# hlf-mobile

Native mobile app for the HLF suite. Single app, four sections — mirrors the
portal: Home / Wheel / Books / Budget / Me.

## Stack

- **Expo SDK 52** + **Expo Router 4** (file-based routing, typed routes on)
- **React Native 0.76** (new architecture enabled)
- **NativeWind 4** (Tailwind for RN — own Tailwind 3.x install, separate from
  the web apps' Tailwind 4)
- **TanStack Query** for server state
- **expo-secure-store** for the auth token
- **lucide-react-native** for icons

## Dev loop (Android, cheapest path)

You don't need EAS, Apple, or Google Play accounts to develop. Install **Expo
Go** on your Android phone from the Play Store, then:

```bash
# from the monorepo root
pnpm install
pnpm --filter hlf-mobile dev
```

Metro starts and prints a QR code. Scan it with Expo Go (phone and Mac must be
on the same WiFi). Edits hot-reload over the LAN.

## When you'll need to graduate from Expo Go

Stay in Expo Go until you need one of:

- A native module not in the Expo Go runtime (e.g. native push, custom Sentry)
- An installed `.apk` build for offline use
- A Play Store / TestFlight release

At that point: free EAS account, `eas build --profile preview --platform android`
produces an APK you can sideload. Google Play account ($25 one-time) only when
publishing to the store.

## Folder structure

```
app/                     Expo Router file-based routes
├── _layout.tsx          Root: QueryClient + GestureHandler + Stack
├── (tabs)/              Bottom tab navigator
│   ├── _layout.tsx
│   ├── index.tsx        Home (dashboard)
│   ├── wheel.tsx        Wheel tracker
│   ├── books.tsx        Bookkeeping
│   ├── budget.tsx       Budget + FIRE
│   └── me.tsx           Profile / admin
├── (auth)/
│   └── sign-in.tsx      Modal sign-in
└── +not-found.tsx
```

## Roadmap

1. Scaffold + auth + dashboard read (token-based sign-in via portal)
2. Wheel read — trades, lots, journal, watchlist
3. Wheel writes — add/close trade, sell shares
4. Bookkeeping
5. Budget + FIRE
6. Alerts inbox + in-app toasts (native push deferred)
7. Profile + admin
