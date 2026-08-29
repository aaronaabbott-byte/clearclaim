-- Marketplace tracking + base-price cap accounting.
-- Run in the Supabase SQL editor.

-- 1) Technology (and other) claims can carry a separate "base price" that counts
--    toward the category cap, since ADE counts the tech cap pre-tax and
--    pre-shipping. When base_price is null, the cap falls back to `amount`.
alter table claims add column if not exists base_price numeric;

-- 2) A lightweight ledger for spend that never became a full in-app claim —
--    e.g. an approved ClassWallet Marketplace order from Best Buy. These entries
--    count toward the per-student caps alongside claims.
create table if not exists cap_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kid_id      uuid references kids (id) on delete cascade,
  category    text,               -- one of the official capped categories
  label       text,               -- what it was, e.g. "Laptop (Best Buy, marketplace)"
  amount      numeric,            -- BASE price (pre-tax, pre-shipping)
  entry_date  date,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists cap_entries_user_kid_idx on cap_entries (user_id, kid_id);

alter table cap_entries enable row level security;

-- Owner-only access, matching the rest of the app.
drop policy if exists "cap_entries owner select" on cap_entries;
create policy "cap_entries owner select" on cap_entries
  for select using (user_id = auth.uid());

drop policy if exists "cap_entries owner insert" on cap_entries;
create policy "cap_entries owner insert" on cap_entries
  for insert with check (user_id = auth.uid());

drop policy if exists "cap_entries owner update" on cap_entries;
create policy "cap_entries owner update" on cap_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cap_entries owner delete" on cap_entries;
create policy "cap_entries owner delete" on cap_entries
  for delete using (user_id = auth.uid());
