# ClearClaim — starter app

A real, login-gated web app for building education-fund (EFA/ESA) reimbursement submissions.
Next.js (App Router) + Supabase (auth + Postgres + file storage), deployable free on Vercel.

## What's wired in this starter
- **Real auth** — passwordless email link + Google sign-in (Supabase). Protected routes via middleware.
- **Minimal student profiles** — first name, grade, setting (homeschool / microschool / private school),
  optional school name + subjects. Nothing sensitive (no SSN, DOB, address, account or bank numbers).
- **Data model for the whole app** — `kids`, `vendors` (with pathway), and `claims` tables, each locked to
  the signed-in user with row-level security. See `supabase/schema.sql`.
- **Shared domain logic** — settings, ClassWallet **pathways** (reimbursement / direct pay / marketplace),
  categories, the rules check, and the reasoning generator live in `lib/rules.js`.

## Next build steps (intentionally left as TODO)
- Port the claim **packager** UI from the prototype into `/dashboard/claims`, storing receipts/bank charges
  in a private Supabase Storage bucket (`documents`) and generating the one-file PDF server-side.
- Seed a per-program **vendor directory** (which vendors are Direct Pay vs reimbursement).
- OCR to auto-read date/store/amount off a receipt image.

## Set it up (about 15 minutes)
1. **Create a Supabase project** (free) at supabase.com → New project.
2. In the project: **SQL Editor** → paste `supabase/schema.sql` → Run.
3. **Storage** → create a private bucket named `documents` (then add the two policies noted at the
   bottom of `schema.sql`).
4. **Authentication → Providers**: keep Email on; optionally enable Google (add OAuth credentials).
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
6. Locally: `cp .env.local.example .env.local` and paste those two values (both are public/safe).
7. `npm install` then `npm run dev` → open http://localhost:3000.

## Deploy (free) on Vercel
1. Push this folder to a new **GitHub** repo.
2. On **vercel.com** → New Project → import the repo.
3. Add the two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Vercel → deploy.
4. In Supabase → Authentication → URL Configuration, add your Vercel URL + `/auth/callback` to the
   allowed redirect URLs.

## Security & trust notes
- The two keys in `.env.local` are **public** by design; never put the Supabase *service_role* key in this
  app or in the browser.
- Row-level security means each family only sees their own rows.
- Uploaded receipts can show an address or card last-4 — keep the `documents` bucket **private**, and plan
  short retention. Never store bank credentials or program account numbers.
