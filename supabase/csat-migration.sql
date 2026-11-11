-- CSAT satisfaction responses. Run once in the Supabase SQL editor. Re-runnable.
--
-- Families see a 1-5 star popup about once a month (throttled in the browser).
-- Their answer lands here. You review results at /admin/csat.

create table if not exists csat_responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  score       int not null check (score between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);
create index if not exists csat_responses_time_idx on csat_responses(created_at);

alter table csat_responses enable row level security;

-- A family can record its own response; it can read its own. Admins read all via
-- the service role (which bypasses RLS), so there's no broad read policy here.
drop policy if exists csat_own_insert on csat_responses;
drop policy if exists csat_own_select on csat_responses;
create policy csat_own_insert on csat_responses
  for insert with check (auth.uid() = user_id);
create policy csat_own_select on csat_responses
  for select using (auth.uid() = user_id);
