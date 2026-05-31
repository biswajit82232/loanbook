# LoanBook

Loan management PWA for tracking borrowers, loans, partner shares, payments, and monthly reports. Built with Vite, React 19, and TypeScript.

- **Local dev:** data in browser `localStorage` (no Supabase env required).
- **Production:** [Vercel](https://vercel.com) + [Supabase](https://supabase.com) with email/password for a single user. See **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Features

- Dashboard with portfolio KPIs and recent payments
- Loans, borrowers, partners, and payments with compact lists
- Interest accrual, partial interest payments, and full settlement
- Partner shares per loan with individual rates
- Monthly reports derived from payment history
- WhatsApp payment reminders and dashboard notification bell
- Settings: theme, accent color, currency, compact lists, reminder period
- Installable PWA with offline caching

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
  components/     UI shell, forms, icons, dialogs
  constants/      Shared navigation config
  context/        Auth, loan book data, navigation
  data/           Types, helpers, seed, settings, Supabase repo
  lib/            Supabase client and env helpers
  pages/          List pages, detail views, forms
  utils/          Appearance, dates, WhatsApp
  App.tsx         Routes via navigation context
  main.tsx        Entry + theme bootstrap
public/           favicon, PWA icons
```

## Data storage

**Cloud (Supabase):** borrowers, loans, payments, partners, and settings sync per authenticated user.

**Local fallback:** `loanbook-data-v1` and `loanbook-settings-v1` in `localStorage` (includes dismissed reminders in settings). Clear site data to reset to seed demo content.

## Install as PWA

- **Mobile:** browser menu → Add to Home Screen
- **Desktop:** install icon in the address bar (Chrome / Edge)
