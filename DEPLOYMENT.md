# Deploy LoanBook (Vercel + Supabase)

LoanBook is a single-user private lending app. Production uses **Vercel** for hosting and **Supabase** for auth + Postgres.

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migration:
   - `supabase/migrations/001_initial_schema.sql`
3. **Authentication → Providers**: keep Email enabled.
4. **Authentication → Users**: create your one user (email + password).
5. **Authentication → Settings**: disable **Enable sign ups** so no one else can register.

Row Level Security on all tables restricts reads/writes to `auth.uid() = user_id`.

## 2. Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Vercel + optional `.env.local` | Project URL (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Vercel + optional `.env.local` | `anon` public key |
| `VITE_ALLOWED_EMAIL` | Vercel (recommended) | Only this email may sign in |

Copy `.env.example` to `.env.local` for local cloud testing.

Without Supabase env vars, the app falls back to **browser localStorage** (dev only).

## 3. Vercel

1. Push the repo to GitHub (or connect your Git provider).
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework preset: **Vite** (auto-detected).
4. Add the three env vars above for **Production** (and Preview if you use it).
5. Deploy. `vercel.json` rewrites all routes to `index.html` for client-side routing.

## 4. First login

1. Open your Vercel URL.
2. Sign in with the Supabase user you created.
3. Data syncs to your user’s rows in Postgres. Changes save automatically when cloud mode is active.

## 5. Migrating existing local data

If you used the app in local-only mode before deploying:

1. Export from browser DevTools → Application → Local Storage (keys used by the app), or keep using the same browser after pointing `.env.local` at Supabase and signing in once—then re-enter data if needed.
2. There is no automatic import UI yet; for a one-time move, you can insert rows in Supabase Table Editor with your `user_id` from **Authentication → Users**.

## Security notes

- The `anon` key is safe in the frontend; RLS enforces per-user access.
- Use a strong password on your single Supabase user.
- Set `VITE_ALLOWED_EMAIL` so even if signups were misconfigured, the app rejects other emails at login.
