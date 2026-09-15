-- Devices & protection plans.
-- A place to store the receipt and the out-of-pocket protection-plan paperwork
-- WITH each device, so when it breaks months later the family can actually find
-- the docs and file a repair. Plan cost is stored for reference only — it is
-- OUT OF POCKET and NOT EFA-eligible, and is never counted toward any cap.
--
-- Run once in the Supabase SQL editor. Storage uses the existing "documents"
-- bucket; its per-user folder policies already cover paths under {user_id}/...,
-- so no new storage policy is needed.

create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kid_id uuid references kids(id) on delete set null,
  name text not null,               -- e.g. "Apple iPad 11"
  serial text,
  purchase_date date,
  purchase_price numeric,           -- reference only
  plan_provider text,               -- e.g. AppleCare, Geek Squad
  plan_cost numeric,                -- OUT OF POCKET, not EFA eligible
  plan_end date,                    -- coverage end date
  plan_contact text,                -- claim phone number or URL
  notes text,
  files jsonb default '[]'::jsonb,  -- [{ path, kind, name }]
  created_at timestamptz default now()
);

alter table devices enable row level security;

-- Owner-only, same pattern as the other user tables.
create policy "own devices" on devices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
