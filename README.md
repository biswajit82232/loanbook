# LoanBook

Loan management PWA for tracking borrowers, loans, partner shares, payments, and monthly reports. Built with Vite, React 19, and TypeScript.

- **Local dev:** data in browser storage (no Supabase env required).
- **Production:** [Vercel](https://vercel.com) + [Supabase](https://supabase.com) with email/password for a single user. See **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Features

- Dashboard with portfolio KPIs, reminders, and recent payments
- Loans, borrowers, partners, and payments with paginated lists (25 per page)
- Interest accrual, borrower-wide interest payments, partial payments, and full settlement
- Partner shares per loan with individual rates
- Monthly reports with KPIs and charts
- WhatsApp payment reminders and dashboard notification bell
- Settings: theme, accent color, currency, compact lists, reminder period
- Installable PWA with offline shell; cloud users get IndexedDB device cache (large books supported)
- Real load progress on sign-in and first sync

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve dist/
npm run lint     # ESLint
```

## Project structure

```
src/
  components/     UI shell, forms, icons, reports, pagination
  constants/      Navigation, brand assets, pagination defaults
  context/        Auth, loan book data, navigation
  data/           Types, helpers, Supabase repo, IndexedDB cache, reports
  hooks/          usePagination
  lib/            Supabase client, env, PWA update, app version
  pages/          List pages, detail views, forms
  utils/          Appearance, dates, WhatsApp, view keys
public/           favicon.png, PWA icons (required for deploy)
supabase/migrations/   Postgres schema + pending migration helper
```

## Data storage

**Cloud (Supabase):** borrowers, loans, payments, partners, and settings sync per authenticated user.

**On-device (cloud users):** full book cached in **IndexedDB** (migrates automatically from older `localStorage` keys). Sync metadata stays in `localStorage`.

**Local-only mode:** no Supabase env vars — book stored in IndexedDB under a local key; settings in `loanbook-settings-v1`.

## Install as PWA

- **Mobile:** browser menu → Add to Home Screen (remove an old shortcut after updates to refresh the icon).
- **Desktop:** install icon in the address bar (Chrome / Edge).

## Version

App version comes from `package.json` and appears in the sidebar and Settings.
