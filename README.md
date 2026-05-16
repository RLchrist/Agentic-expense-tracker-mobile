# Expense Tracker

A React Native (Expo) personal finance app with **Supabase** backend, **offline-first** syncing, and **agentic AI** helpers: natural-language expense parsing, receipt scanning, and voice input. When online, the app prefers Supabase Edge Functions; when offline or if the network call fails, it falls back to on-device models (NLP, OCR, speech).

## Features

- **Authentication** — Email registration and login with Supabase Auth; session stored securely (MMKV).
- **Dashboard & expense list** — Track spending with a clear home view and full expense history.
- **Add expenses** — Manual entry with AI-assisted parsing from plain text.
- **Receipt scanner** — Capture or pick receipt images; online OCR via Edge Functions, local fallback via Tesseract.
- **Voice input** — Speech-to-text and expense extraction with online/offline routing.
- **Analytics & budgets** — Charts (Victory Native), budgets, and alerts.
- **Offline support** — SQLite queue for pending operations; automatic sync when connectivity returns.
- **Export & notifications** — PDF/share flows and budget-related notifications (see app settings).

## Tech stack

| Area | Choices |
|------|---------|
| App | Expo SDK 54, React 19, React Native 0.81, TypeScript |
| Navigation | React Navigation (tabs + native stack) |
| Backend | Supabase (Auth, Edge Functions, Postgres) |
| Local state & cache | Zustand, TanStack Query, MMKV, Expo SQLite |
| AI / ML | Supabase Functions online; ONNX Runtime, Tesseract, Whisper-related libs on-device |

## Prerequisites

- **Node.js** (LTS recommended; matches Expo 54 expectations)
- **pnpm** — This repo pins `pnpm@10.33.0` in `package.json`. Install pnpm if needed: [pnpm.io/installation](https://pnpm.io/installation).
- **Supabase project** — Create a project at [supabase.com](https://supabase.com) and deploy/configure Edge Functions (e.g. `parse-expense` and related functions referenced in the app) to match your backend.
- For **iOS**: Xcode and CocoaPods (on macOS).
- For **Android**: Android Studio, SDK, and an emulator or device with USB debugging.

Some native capabilities (on-device ML, full camera/Tesseract paths) work best with a **development or production native build**, not only the stock Expo Go client.

## Installation

```bash
git clone <repository-url>
cd agentic-expense-tracker
pnpm install
```

## Configuration

1. Copy the environment template and fill in your Supabase values:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set:

   - `EXPO_PUBLIC_SUPABASE_URL` — Project URL (Settings → API in the Supabase dashboard).
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — The `anon` **public** key (safe for client apps; never commit service role keys).

Expo loads variables prefixed with `EXPO_PUBLIC_` into the client bundle. Restart the dev server after changing `.env`.

## Running the app

From the project root:

| Command | Description |
|---------|-------------|
| `pnpm start` | Start the Expo dev server (Metro). Press `a` / `i` for emulator, or scan the QR code with Expo Go or a dev build. |
| `pnpm android` | Build and run on Android (`expo run:android`). |
| `pnpm ios` | Build and run on iOS (`expo run:ios`, macOS only). |
| `pnpm web` | Start the web target (`expo start --web`). |

### Android Reverse Proxy Note

When using a physical device with a local Supabase emulator or custom API, you may need to adjust Metro/host IP; the Expo docs cover **adb reverse** and LAN debugging for your setup.

## Building with EAS

The repo includes `eas.json` for [EAS Build](https://docs.expo.dev/build/introduction/). Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for your build profiles via **EAS secrets** or dashboard env (do not commit production secrets to git).

Example (after [EAS CLI](https://docs.expo.dev/eas/) login and project link):

```bash
eas build --platform android --profile preview
```

Adjust profile names (`development`, `preview`, `production`) as needed.

## Project layout (overview)

- `App.tsx` — Root component, auth listener, network-aware offline queue drain.
- `src/navigation/` — `RootNavigator` (auth vs main), `MainNavigator` (tabs and stacks).
- `src/screens/` — Auth, dashboard, expenses, settings, receipt flow.
- `src/services/` — Supabase client, AI routing, sync, notifications, export.
- `src/store/` — Zustand stores (auth, expenses, budgets).
- `supabase/functions/` — Edge Function sources (deploy with Supabase CLI).

## Troubleshooting

- **“Invalid API key” / auth errors** — Check `.env` values and that the Supabase project is active; restart Metro with cache clear: `pnpm start -- --clear`.
- **Native module errors in Expo Go** — Use `expo run:android` / `expo run:ios` or an EAS development build for modules that are not included in Expo Go.
- **Sync not running** — Ensure network permission on device and that `NetInfo` reports connectivity; queued operations flush when the app comes back online.

## License

No license file is included in this repository; add one if you plan to distribute or open-source the project.
