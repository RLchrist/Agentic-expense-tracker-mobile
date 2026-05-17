# Expense Tracker

A React Native (Expo) personal finance app with **Supabase** backend, **offline-first** syncing, and **agentic AI** helpers. Log spending via natural language, voice, receipt photos, or manual forms — the app routes requests to Supabase Edge Functions when online and falls back to on-device models (NLP, OCR, speech) when offline or when the network call fails.

## Features

### Core tracking

- **Authentication** — Email registration and login with Supabase Auth; session persisted via Supabase client.
- **Dashboard (Home)** — Balance summary (today / week / month), recent expenses, and a unified quick-add bar for AI-assisted entry.
- **Expense list** — Full history with search, date filters (today, week, month), category filters, and swipe-to-delete.
- **Manual add expense** — Structured form with custom categories and payment methods, optional **recurring** schedules (daily, weekly, monthly, yearly).
- **Recurring automation** — On launch, due recurring expenses are generated automatically; budget periods roll forward when their end date passes.

### Agentic AI input

- **Natural-language parsing** — Type plain text (e.g. “Rs. 500 lunch at Thamel”) and parse into title, amount, category, and date.
- **Multi-modal parsing** — Attach one or more receipt/photo images alongside text; online vision models extract expense details (Groq via Edge Function).
- **Voice input** — Real-time speech recognition on the dashboard and a dedicated voice modal; transcripts are parsed the same way as typed text.
- **Receipt scanner** — Dedicated camera/gallery flow with online OCR (Edge Functions) and local Tesseract fallback.
- **Online / offline routing** — `aiRouter` prefers Supabase `parse-expense` when connected; falls back to on-device ONNX NLP, Tesseract OCR, and local STT.

### Analytics & budgets

- **Analytics tab** — Category breakdown, 7-day spending bars, payment-method split, and period toggles (week / month / year).
- **Budgets tab** — Per-category limits with spent vs. budget progress, over-budget indicators, and push notifications when thresholds are crossed.
- **Daily reminders** — Optional scheduled notification from Settings.

### Settings & personalization

- **Dedicated Settings tab** — Profile card, sync status, and app preferences in one place.
- **Profile avatar** — Upload to Supabase Storage (`avatars` bucket).
- **Biometric login** — Face ID / fingerprint unlock using credentials stored in Expo Secure Store (enable in Settings after a password sign-in).
- **Theme** — Light, dark, or system appearance (NativeWind + React Navigation theming).
- **Internationalization (i18n)** — English and Nepali (`en` / `np`); device locale detection with persisted language choice.
- **Currency** — Profile currency (default NPR) shown across the app.

### Data & sync

- **Offline support** — SQLite queue for pending operations; automatic drain when connectivity returns (`NetInfo` + `drainQueue`).
- **Export** — Share expenses as **CSV** or **PDF** from Settings.
- **Cloud backup** — Expenses, categories, and budgets synced to Supabase Postgres with row-level security.

### UI

- **NativeWind (Tailwind)** — Utility-first styling with semantic color tokens (`bg-background`, `text-text`, etc.).
- **Lucide icons** — Consistent iconography across tabs, categories, and actions; dynamic category icons on dashboard and expense screens.

## App navigation

Five bottom tabs plus stack modals:

| Tab | Screen | Highlights |
|-----|--------|--------------|
| Home | Dashboard | Quick-add, voice, images, balance, recent list |
| Expenses | Expense list | Search, filters, delete |
| Analytics | Charts & breakdowns | Period and category views |
| Budgets | Budget management | Create, track, alerts |
| Settings | Preferences & export | Theme, language, biometrics, sync |

Stack screens: **Add Expense**, **Receipt Scanner**.

## Tech stack

| Area | Choices |
|------|---------|
| App | Expo SDK 54, React 19, React Native 0.81, TypeScript |
| Styling | NativeWind 4, Tailwind CSS 3, `global.css` |
| Navigation | React Navigation 7 (bottom tabs + native stack) |
| Icons | Lucide React Native |
| i18n | i18next, react-i18next, react-native-localize |
| Backend | Supabase (Auth, Storage, Edge Functions, Postgres + RLS) |
| Local state & cache | Zustand, TanStack Query, Expo SQLite, Expo Secure Store |
| AI / ML | Supabase `parse-expense` (Groq) online; ONNX Runtime, Tesseract, Whisper-related libs on-device |
| Charts | Victory Native (where used in analytics views) |
| Notifications | expo-notifications |

## Prerequisites

- **Node.js** (LTS recommended; matches Expo 54 expectations)
- **pnpm** — This repo pins `pnpm@10.33.0` in `package.json`. Install pnpm if needed: [pnpm.io/installation](https://pnpm.io/installation).
- **Supabase project** — Create a project at [supabase.com](https://supabase.com), run migrations in `supabase/migrations/`, deploy the `parse-expense` Edge Function, and create an **`avatars`** storage bucket for profile photos.
- **Groq API key** (online AI) — Set `GROQ_API_KEY` as a secret for the `parse-expense` Edge Function in the Supabase dashboard.
- For **iOS**: Xcode and CocoaPods (on macOS).
- For **Android**: Android Studio, SDK, and an emulator or device with USB debugging.

Some native capabilities (on-device ML, biometrics, full camera/Tesseract paths) work best with a **development or production native build**, not only the stock Expo Go client.

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

3. Apply database migrations and deploy Edge Functions (Supabase CLI):

   ```bash
   supabase db push
   supabase functions deploy parse-expense
   ```

4. In the Supabase dashboard, add Edge Function secret `GROQ_API_KEY` for multimodal / text parsing.

Expo loads variables prefixed with `EXPO_PUBLIC_` into the client bundle. Restart the dev server after changing `.env`.

## Running the app

From the project root:

| Command | Description |
|---------|-------------|
| `pnpm start` | Start the Expo dev server (Metro). Press `a` / `i` for emulator, or scan the QR code with Expo Go or a dev build. |
| `pnpm android` | Build and run on Android (`expo run:android`). |
| `pnpm ios` | Build and run on iOS (`expo run:ios`, macOS only). |
| `pnpm web` | Start the web target (`expo start --web`). |

### Android reverse proxy

When using a physical device with a local Supabase emulator or custom API, you may need to adjust Metro/host IP; the Expo docs cover **adb reverse** and LAN debugging for your setup.

## Building with EAS

The repo includes `eas.json` for [EAS Build](https://docs.expo.dev/build/introduction/). Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for your build profiles via **EAS secrets** or dashboard env (do not commit production secrets to git).

Example (after [EAS CLI](https://docs.expo.dev/eas/) login and project link):

```bash
eas build --platform android --profile preview
```

Adjust profile names (`development`, `preview`, `production`) as needed.

## Project layout (overview)

- `App.tsx` — Root component, theme sync, auth listener, network-aware offline queue drain.
- `global.css` — NativeWind / Tailwind entry styles.
- `src/navigation/` — `RootNavigator` (auth vs main), `MainNavigator` (tabs and stacks).
- `src/screens/` — Auth, dashboard, expenses, analytics, budgets, settings, receipt flow.
- `src/components/` — Shared UI (e.g. `VoiceExpenseModal`).
- `src/services/` — Supabase client, AI routing (`aiRouter`, local NLP/OCR/STT), sync, notifications, export, recurring jobs.
- `src/store/` — Zustand stores (auth, expenses, budgets, settings).
- `src/i18n.ts` — i18next setup and language switching.
- `src/assets/lang/` — `en.json`, `ne.json` translation files.
- `src/lib/storage.ts` — Secure Store helpers (biometric credentials).
- `supabase/migrations/` — Postgres schema (profiles, expenses, budgets, sync queue, AI metadata).
- `supabase/functions/parse-expense/` — Edge Function for online text + vision parsing.

## Troubleshooting

- **“Invalid API key” / auth errors** — Check `.env` values and that the Supabase project is active; restart Metro with cache clear: `pnpm start -- --clear`.
- **AI parsing always fails online** — Confirm `parse-expense` is deployed and `GROQ_API_KEY` is set in Supabase Edge Function secrets.
- **Avatar upload fails** — Ensure the `avatars` storage bucket exists and RLS policies allow the authenticated user to upload.
- **Biometric login unavailable** — Enable biometrics in Settings after signing in with email/password once; requires a dev/production build with `expo-local-authentication`.
- **Native module errors in Expo Go** — Use `expo run:android` / `expo run:ios` or an EAS development build for modules that are not included in Expo Go.
- **Sync not running** — Ensure network permission on device and that `NetInfo` reports connectivity; queued operations flush when the app comes back online.

## License

No license file is included in this repository; add one if you plan to distribute or open-source the project.
