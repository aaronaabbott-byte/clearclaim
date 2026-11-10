# Notifications + automated error handling — setup

Two features ship together here:

1. **Proactive email notifications** — the app emails a family when a claim is
   marked approved, when a claim they've marked *ready* is still missing a
   receipt / proof of payment / educational note, and 30 and 7 days before the
   budget year ends. Families opt out per-type in Settings → Email reminders.
2. **Automated error-handling loop** — a check runs every ~20 min, groups errors
   by signature, applies only safe/reversible fixes on its own, and emails the
   admins a digest of anything recurring that still needs a human. Review and
   triage at **/admin/health**.

## 1. Run the migration

In the Supabase SQL editor, run `supabase/notifications-and-health-migration.sql`
(safe to re-run). It adds the opt-out columns, `notification_log`,
`error_events`, and `error_clusters`.

## 2. Set environment variables (Vercel → Settings → Environment Variables)

| Var | Needed for | Notes |
|-----|-----------|-------|
| `CRON_SECRET` | both crons | Long random string. Cron routes 401 without it (fail-closed). |
| `RESEND_API_KEY` | all email | From resend.com. Unset = sending is a safe no-op. |
| `NOTIFY_FROM` | all email | e.g. `ClearClaim <notify@clearclaimapp.com>` (verify the domain in Resend). |
| `NOTIFY_REPLY_TO` | optional | Reply-to address. |
| `NEXT_PUBLIC_SITE_URL` | optional | Used in email links; falls back to request host. |
| `SUPABASE_SERVICE_ROLE_KEY` | both crons + health panel | Already set for the admin panel. |
| `ADMIN_EMAILS` | health digest | Already set for /admin; the digest goes here. |

## 3. Schedules

`vercel.json` declares a single daily cron, `/api/cron/daily`, which fans out to
the notifications scan, the health check, and (on Mondays) the feature digest.
This is to fit Vercel **Hobby**'s limit of 2 cron jobs at daily frequency — the
tradeoff is the health check runs once a day instead of every 20 minutes. On
**Pro**, you can instead schedule `/api/cron/health` directly at `*/20 * * * *`
and `/api/cron/notifications` daily, and drop `/api/cron/daily`. Each sub-job is
still its own route, so you can also curl any of them directly.

Vercel attaches the `CRON_SECRET` automatically. On **Cloudflare** instead, add a
Cron Trigger in a Worker that does
`fetch(url, { headers: { Authorization: "Bearer <CRON_SECRET>" } })` on the same
two paths — the routes don't care who calls them, only that the header matches.

Trigger either manually to test:
```
curl -H "Authorization: Bearer $CRON_SECRET" https://clearclaimapp.com/api/cron/notifications
curl -H "Authorization: Bearer $CRON_SECRET" https://clearclaimapp.com/api/cron/health
```
Each returns a JSON summary of what it did.

## 4. Logging errors into the loop

Call `logError` from any catch block you want tracked (it never throws):
```js
import { logError } from "@/lib/errors";
try { /* ... */ } catch (e) { await logError("api/whatever", e, { userId }); }
```
It's already wired into `app/api/ann/route.js` as an example. Add it wherever
you want visibility — the health loop picks everything up by signature.

## What is and isn't auto-fixed

The loop only applies fixes in `lib/safefixes.js` — reversible, non-destructive,
touching no code/schema/rules/money/user content (today: retrying transient
unsent email, clearing a stale internal lock). **Everything else always waits
for you** and shows up in the digest and at /admin/health, where you can
Acknowledge, Resolve, or Reopen it. To let the loop handle a new case, add a
narrowly-scoped entry to that allow-list yourself — nothing is added
automatically.

## Notes / caveats

- "Approved" notifications fire off the parent-entered outcome (the app has no
  Department integration), so it doubles as a confirmation/record. If you later
  get a real status feed, the same code path works unchanged.
- Deadline reminders use the existing `efaBudgetYear()` end date and are sent
  only to Arkansas accounts, so no new state rule is assumed.
- Nothing sends until `RESEND_API_KEY` + `NOTIFY_FROM` are set, so you can deploy
  and watch the cron summaries before any family gets an email.
