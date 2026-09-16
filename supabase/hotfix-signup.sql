-- HOTFIX for two live signup issues. Run this ONCE in the Supabase SQL editor.
--
-- 1) "Can't add a student" — the add-student insert writes kids.award_amount,
--    which only exists if award-migration.sql was run. If it wasn't, every insert
--    fails. This adds the column (and the other kids columns, defensively).
--
-- 2) "Arkansas signups land on the Free plan" — Arkansas families are supposed to
--    get the Family plan for free via entitlements.free_family, which a trigger
--    sets from the profile's state. If the trigger wasn't installed, or it treated
--    a blank state as non-Arkansas, AR users never got flagged. This reinstalls
--    the trigger so a blank/unset state counts as Arkansas, and backfills every
--    existing account.
--
-- Safe to re-run.

-- ---- 1. Make sure the kids columns the app writes actually exist ------------
alter table kids add column if not exists funding_tier text not null default 'standard';
alter table kids add column if not exists program_start_year integer;
alter table kids add column if not exists prior_tech text;
alter table kids add column if not exists sort_order integer;
alter table kids add column if not exists award_amount numeric;

-- ---- 2. Arkansas free-Family: trigger + backfill ----------------------------
-- Blank/unset state is treated as Arkansas (the program the app launched with).
alter table entitlements add column if not exists free_family boolean not null default false;

create or replace function sync_ar_free_family()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into entitlements (user_id, free_family)
  values (NEW.user_id, (upper(coalesce(NEW.state, 'AR')) = 'AR'))
  on conflict (user_id) do update
    set free_family = (upper(coalesce(NEW.state, 'AR')) = 'AR');
  return NEW;
end;
$$;

drop trigger if exists ar_free_family on profiles;
create trigger ar_free_family
  after insert or update on profiles
  for each row execute function sync_ar_free_family();

-- Backfill existing accounts. Update rows that already have an entitlement...
update entitlements e
  set free_family = (upper(coalesce(p.state, 'AR')) = 'AR')
  from profiles p
  where p.user_id = e.user_id;

-- ...and create one for any profile that doesn't have an entitlement yet.
insert into entitlements (user_id, free_family)
  select p.user_id, (upper(coalesce(p.state, 'AR')) = 'AR')
  from profiles p
  where not exists (select 1 from entitlements e where e.user_id = p.user_id);
