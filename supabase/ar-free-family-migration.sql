-- Arkansas families get the Family plan free (providers still pay).
-- A `free_family` flag on entitlements, kept in sync with the account's state by
-- a trigger, so every existing plan check (planFrom) just works.

alter table entitlements add column if not exists free_family boolean not null default false;

-- Keep free_family = (state is Arkansas) whenever a profile is created or its
-- state changes. Creates the entitlement row if needed.
create or replace function sync_ar_free_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into entitlements (user_id, free_family)
    values (NEW.user_id, upper(coalesce(NEW.state, '')) = 'AR')
  on conflict (user_id) do update
    set free_family = (upper(coalesce(NEW.state, '')) = 'AR');
  return NEW;
end;
$$;

drop trigger if exists ar_free_family on profiles;
create trigger ar_free_family
  after insert or update of state on profiles
  for each row execute function sync_ar_free_family();

-- Backfill existing accounts.
insert into entitlements (user_id, free_family)
  select user_id, upper(coalesce(state, '')) = 'AR' from profiles
on conflict (user_id) do update
  set free_family = (select upper(coalesce(p.state, '')) = 'AR' from profiles p where p.user_id = entitlements.user_id);
