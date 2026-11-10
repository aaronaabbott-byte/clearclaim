# Automated feature requests (#3) — setup

When a family hits something the app can't do, it's recorded automatically,
clustered, and surfaced to you — so real gaps become a prioritized to-do instead
of getting lost.

## What's captured

| Trigger | Where | When |
|--------|-------|------|
| `ann_unanswered` | Ann chat (`/api/ann`) | Ann's reply clearly signals it couldn't answer (tight pattern — a normal "contact ADE" answer is NOT flagged). |
| `denial_unmapped` | Denial fixer (`/api/diagnose`) | The curated rules didn't recognize the reviewer's denial reason. |
| `user_request` | Ann chat | The family clicks "This didn't answer my question" under a reply. |
| `user_request` / `unsupported` | `/api/feature-request` | Any explicit submission you wire a button to. |

## Keeping it from becoming noise

- **Clustered, not one-row-per-hit.** Similar hits collapse onto one
  `feature_requests` row by signature, with a running `count`, up to 5 verbatim
  examples, and the set of states they came from. The most-requested things rise
  to the top of `/admin/requests`.
- **Thin asks are dropped** (fewer than ~3 meaningful words).
- **Anonymized.** Samples store a one-way hash of the user id, never the id or
  email — enough to tell "same family twice" apart from "two families."
- **Weekly digest, only what moved.** `/api/cron/feature-digest` emails the
  admins once a week, and only includes requests that are new or have grown since
  the last digest — nothing that's been sitting unchanged.
- **Auto-close.** Mark a request **Shipped** or **Dismissed** and it leaves the
  open list and the digest. If families hit it again afterward, capture reopens
  it so you know the fix didn't land.

## Setup

1. Run `supabase/feature-requests-migration.sql` in the Supabase SQL editor.
2. No new env vars — it reuses `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`,
   `ADMIN_EMAILS`, and the same Resend config as the other features.
3. The weekly cron is already in `vercel.json` (`/api/cron/feature-digest`,
   Mondays 14:00 UTC). On Cloudflare, hit the same path with the Bearer header.

Triage at **/admin/requests** (linked from the admin Usage card). Test the digest
manually:
```
curl -H "Authorization: Bearer $CRON_SECRET" https://clearclaimapp.com/api/cron/feature-digest
```

## Tuning

- Raise `MIN_COUNT` in `app/api/cron/feature-digest/route.js` to only email about
  things hit more than once.
- Tighten or loosen the Ann "couldn't answer" pattern in `app/api/ann/route.js`
  if it's too eager or too quiet.
- Add new automatic capture points anywhere with:
  `await captureFeatureRequest({ trigger, text, state, userId })` — it clusters
  and never throws.
