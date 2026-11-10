-- Proactive notifications (#1) + automated error handling (#2).
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ───────────────────────── Notifications ─────────────────────────

-- Opt-out flags on the profile. Default ON (families expect to hear about
-- their own claims), but they can turn email off. Stored per-account.
alter table profiles add column if not exists notify_email     boolean not null default true;
alter table profiles add column if not exists notify_deadlines  boolean not null default true;

-- One row per message actually sent. This is the dedupe ledger: before sending
-- anything we check here, so a nightly scan never emails the same thing twice.
-- dedupe_key lets us send the SAME kind for the SAME claim more than once when
-- the trigger genuinely changes (e.g. a 30-day vs 7-day deadline reminder).
create table if not exists notification_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,                 -- approved | missing | deadline | pending_reminder
  ref_id      text,                          -- the claim/preapproval id it's about
  dedupe_key  text not null default '',      -- distinguishes repeat sends of the same kind+ref
  channel     text not null default 'email',
  to_address  text,
  sent_at     timestamptz not null default now(),
  meta        jsonb not null default '{}'::jsonb
);
create unique index if not exists notification_log_dedupe
  on notification_log(user_id, kind, coalesce(ref_id,''), dedupe_key);
create index if not exists notification_log_user_idx on notification_log(user_id);

alter table notification_log enable row level security;
drop policy if exists "read own notifications" on notification_log;
create policy "read own notifications" on notification_log
  for select using (auth.uid() = user_id);
-- Inserts happen only from the server (service role), which bypasses RLS, so
-- there is intentionally no insert policy for end users here.

-- ───────────────────────── Error handling ─────────────────────────

-- Raw error events. The app calls logError() in catch blocks; the health cron
-- reads this table, groups by signature, and ages rows out (see cleanup below).
create table if not exists error_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  signature   text not null,                 -- stable hash of normalized message + source
  source      text,                          -- e.g. "api/ann", "api/share", "cron/notifications"
  message     text,                          -- human-readable, truncated
  severity    text not null default 'error', -- info | warn | error
  user_id     uuid,                          -- nullable; not an FK so logging never fails
  context     jsonb not null default '{}'::jsonb
);
create index if not exists error_events_sig_idx  on error_events(signature);
create index if not exists error_events_time_idx on error_events(created_at);

-- One row per distinct error signature — the dedupe/triage view the cron keeps
-- up to date. status drives whether you still need to look at it.
create table if not exists error_clusters (
  signature        text primary key,
  first_seen       timestamptz not null default now(),
  last_seen        timestamptz not null default now(),
  count            integer not null default 0,
  source           text,
  sample_message   text,
  sample_context   jsonb not null default '{}'::jsonb,
  status           text not null default 'open',  -- open | acknowledged | resolved | auto_fixed
  auto_fix         text,                           -- name of the safe fix applied, if any
  needs_approval   boolean not null default true,  -- true = waits for you; false = a safe auto-fix ran
  last_alerted_at  timestamptz
);
create index if not exists error_clusters_status_idx on error_clusters(status);

alter table error_events   enable row level security;
alter table error_clusters enable row level security;
-- No end-user policies: these are server/admin-only (service role bypasses RLS).

-- Optional housekeeping you can run on a schedule: keep raw events ~30 days.
-- delete from error_events where created_at < now() - interval '30 days';
