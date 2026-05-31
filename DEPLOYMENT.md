# Deploy LoanBook (Vercel + Supabase)

LoanBook is a single-user private lending app. Production uses **Vercel** for hosting and **Supabase** for auth + Postgres.

## Pre-deploy checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `public/` contains `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`
- [ ] Supabase schema is up to date (see §1)
- [ ] Vercel env vars set (see §2)
- [ ] Push all changes including `public/*.png` and `supabase/migrations/`

## 1. Supabase project

### New project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run **`supabase/migrations/001_initial_schema.sql`** once.

### Existing project (created before v1.2)

Run **`supabase/migrations/apply_pending_migrations.sql`** if you have not already. It adds:

- `borrowers.updated_at`
- `loans.description`

Verify columns:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('borrowers', 'loans')
  and column_name in ('updated_at', 'description');
```

You should see two rows. Safe to re-run `apply_pending_migrations.sql`.

### Auth

1. **Authentication → Providers**: keep Email enabled.
2. **Authentication → Users**: create your one user (email + password).
3. **Authentication → Settings**: disable **Enable sign ups**.

Row Level Security on all tables restricts reads/writes to `auth.uid() = user_id`.

## 2. Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Vercel + optional `.env.local` | Project URL (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Vercel + optional `.env.local` | `anon` public key |
| `VITE_ALLOWED_EMAIL` | Vercel (recommended) | Only this email may sign in |

Copy `.env.example` to `.env.local` for local cloud testing.

Without Supabase env vars, the app runs in **local-only** mode (IndexedDB on device, no cloud sync).

Never commit `.env.local` or real keys to git.

## 3. Vercel

1. Push the repo to GitHub (or connect your Git provider).
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework preset: **Vite** (auto-detected).
4. Build command: `npm run build` (default).
5. Output directory: `dist` (default).
6. Add the three env vars above for **Production** (and Preview if you use it).
7. Deploy. `vercel.json` rewrites SPA routes to `index.html`.

After deploy, hard-refresh or reinstall the PWA so users get the new service worker and icons.

## 4. First login

1. Open your Vercel URL.
2. Sign in with the Supabase user you created.
3. Data syncs to your user’s rows in Postgres. Changes save automatically when cloud mode is active.

## 5. Device cache (v1.2+)

Cloud users store an offline copy in **IndexedDB** (not the 5 MB `localStorage` limit). On first open after upgrade, any old `localStorage` cache is migrated into IndexedDB and then removed from `localStorage`.

If device storage fails, a toast explains the issue; data remains in memory and Supabase remains the source of truth when online.

## 6. Migrating existing local data

If you used the app in local-only mode before deploying:

1. There is no automatic import UI yet.
2. For a one-time move, insert rows in Supabase Table Editor with your `user_id` from **Authentication → Users**, or re-enter data after signing in on production.

## Security notes

- The `anon` key is safe in the frontend; RLS enforces per-user access.
- Use a strong password on your single Supabase user.
- Set `VITE_ALLOWED_EMAIL` so even if signups were misconfigured, the app rejects other emails at login.
