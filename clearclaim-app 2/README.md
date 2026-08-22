# ClearClaim — app

A real, login-gated web app for building education-fund (EFA/ESA) reimbursement submissions.
Next.js (App Router) + Supabase (auth + Postgres + file storage), deployable free on Vercel.

## What's wired in
- **Email + password auth** (Supabase). Sign in or create an account on one screen. A session-refresh
  middleware keeps the parent signed in across visits, and gates every route to signed-in users.
- **Minimal, editable student profiles** — first name, grade, setting (homeschool / private school),
  optional school name + subjects. Add, edit inline, and remove students on the dashboard. Nothing
  sensitive (no SSN, DOB, address, account or bank numbers).
- **Co-curricular course check** — the ten-requirement Arkansas checklist (6 CAR § 35-102) as a live,
  interactive guide: tick each requirement, see the document to gather for it, and get a running
  read on whether a class qualifies as co-curricular vs. extracurricular. Lives in `lib/rules.js`
  (`COCURRICULAR`, `checkCocurricular`) and `app/dashboard/cocurricular.js`.
- **Data model** — `kids`, `vendors` (with pathway), and `claims` tables, each locked to the signed-in
  user with row-level security. See `supabase/schema.sql`.
- **Shared domain logic** — settings, ClassWallet **pathways** (reimbursement / direct pay), categories,
  the rules check, and the reasoning generator in `lib/rules.js`.

## Next build steps (TODO)
- Port the claim **packager** UI from the prototype into `/dashboard/claims`, storing receipts/bank
  charges in a private Supabase Storage bucket (`documents`) and generating the one-file PDF server-side.
- Seed a per-program **vendor directory** (Direct Pay vs reimbursement).
- OCR to auto-read date/store/amount off a receipt image.

## Set it up locally (about 10 minutes)
1. **Supabase** is already provisioned for this project. To run locally, from **Project Settings → API**
   copy the **Project URL** and the **anon public** key.
2. `cp .env.local.example .env.local` and paste those two values (both are public/safe).
3. `npm install` then `npm run dev` → open http://localhost:3000.

If you ever start a fresh Supabase project: **SQL Editor** → paste `supabase/schema.sql` → Run; then
**Storage** → create a private bucket named `documents`.

## Password sign-up: one Supabase toggle
By default Supabase requires new users to confirm their email before the password works. For a smooth
"create account → straight into the app" flow:
- Supabase → **Authentication → Providers → Email** → turn **"Confirm email" OFF**.
The login screen handles it either way: if confirmation is on, creating an account shows
"check your email to confirm, then sign in."

## Deploy on Vercel — IMPORTANT: no spaces in the folder name
Vercel builds a serverless function whose name includes the project folder path. **A space in that path
(e.g. `clearclaim-app 2`) makes the build fail** with "A Serverless Function has an invalid name … must
not contain any space." So put this code at a clean path:

**Recommended — code at the repo root:**
1. In your GitHub repo, upload the *contents* of this `clearclaim` folder to the **repo root**
   (so `package.json`, `app/`, `lib/`, `middleware.js` sit at the top level — not inside a subfolder).
2. Vercel → Project → **Settings → Build & Deployment**: set **Framework Preset = Next.js** and leave
   **Root Directory blank**.
3. Vercel → Settings → **Environment Variables**: add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Deployments → Redeploy** (uncheck build cache the first time).

(Alternative: keep it in a subfolder, but name the folder with **no space** — e.g. `clearclaim` — and set
Vercel's Root Directory to exactly that name.)

5. In Supabase → **Authentication → URL Configuration**, set the **Site URL** to your Vercel URL and add
   `https://YOUR-APP.vercel.app/**` to the redirect allow-list.

## Security & trust notes
- The two keys in `.env.local` are **public** by design; never put the Supabase *service_role* key in this
  app or in the browser.
- Row-level security means each family only sees their own rows.
- Uploaded receipts can show an address or card last-4 — keep the `documents` bucket **private**, and plan
  short retention. Never store bank credentials or program account numbers.
