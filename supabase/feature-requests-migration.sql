-- Automated feature requests (#3). Run once in the Supabase SQL editor. Re-runnable.
--
-- When a family hits something the app can't do — Ann can't answer, a denial
-- reason the fixer doesn't recognize, or an explicit "I wish it could…" — we
-- record it. To keep it from becoming noise we do NOT store one row per hit:
-- similar hits collapse onto one row (by signature) with a running count, a few
-- verbatim examples, and which states they came from. You triage at /admin/requests.

create table if not exists feature_requests (
  signature     text primary key,              -- stable hash of trigger + normalized text
  trigger       text not null,                 -- ann_unanswered | denial_unmapped | user_request | unsupported
  title         text,                          -- short human label (first example, trimmed)
  count         integer not null default 0,    -- how many times families have hit it
  states        text[] not null default '{}',  -- distinct states it came from (for breakdown)
  samples       jsonb not null default '[]'::jsonb, -- up to 5 {text, user_hash, at} verbatim examples
  status        text not null default 'open',  -- open | planned | shipped | dismissed
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  last_digested_at timestamptz
);
create index if not exists feature_requests_status_idx on feature_requests(status);
create index if not exists feature_requests_count_idx  on feature_requests(count desc);

alter table feature_requests enable row level security;
-- Server/admin-only (service role bypasses RLS); no end-user policies on purpose.
