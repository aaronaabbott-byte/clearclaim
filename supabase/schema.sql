-- ClearClaim schema. Run in the Supabase SQL editor.
-- Every table is scoped to the signed-in user via row-level security.

create table if not exists kids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  grade text,
  setting text not null default 'homeschool',   -- homeschool | school
  school_name text,                              -- only when setting = school/microschool
  subjects text,                                 -- optional, comma-separated
  funding_tier text not null default 'standard', -- standard | succeed (scales the 25% caps)
  created_at timestamptz default now()
);
-- If the kids table already exists from an earlier version, add the columns:
alter table kids add column if not exists funding_tier text not null default 'standard';
alter table kids add column if not exists program_start_year integer;  -- first program year (for the July 1 first-year floor, 35-111(a)(2)(F)(ii)(b))
alter table kids add column if not exists prior_tech text;  -- parent-listed prior EFA technology (device + year), used by the technology justification path. Device descriptions only, never health data.
alter table kids add column if not exists sort_order integer;  -- manual display order set by the parent on the Manage Students page. Null sorts last (falls back to created_at).

-- Claim outcome capture (parent-reported), so we can learn from real denials.
alter table claims add column if not exists outcome text;         -- approved | denied
alter table claims add column if not exists outcome_reason text;  -- reviewer's stated reason
alter table claims add column if not exists outcome_date date;

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  pathway text not null default 'reimbursement', -- reimbursement | directpay | marketplace
  program text,                                  -- e.g. 'AR-EFA'
  notes text,
  created_at timestamptz default now()
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kid_id uuid references kids(id) on delete set null,
  vendor text,
  pathway text not null default 'reimbursement',
  amount numeric(10,2),
  date date,
  category text,
  items text,
  purpose text,
  reasoning text,
  files jsonb default '[]'::jsonb,               -- [{path, kind, name}] in the documents bucket
  status text default 'draft',                   -- draft | ready | submitted
  created_at timestamptz default now()
);

-- If the claims table already exists from an earlier version, add the column:
alter table claims add column if not exists files jsonb default '[]'::jsonb;

-- Per-student course syllabi — documentation that proves educational use.
create table if not exists syllabi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kid_id uuid references kids(id) on delete cascade,
  title text,                 -- course title, e.g. "5th-Grade Latin"
  subject text,               -- subject area, e.g. "World Languages"
  grade text,
  term text,                  -- e.g. "2026-27"
  level text,                 -- Beginner | Intermediate | Advanced
  weeks text,
  sessions_per_week text,
  instructor text,
  description text,
  objectives text,            -- learning objectives
  standards text,             -- standards / skills alignment
  materials text,             -- curriculum & materials used
  schedule text,              -- week-by-week or unit plan
  assessment text,            -- how progress is graded/assessed
  status text default 'draft',
  created_at timestamptz default now()
);

-- Family document library — booklists, supply lists, and other supporting docs.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kid_id uuid references kids(id) on delete set null,
  label text,
  kind text,                  -- booklist | supply | receipt | annotated | other
  path text not null,         -- object path in the 'documents' storage bucket
  filename text,
  created_at timestamptz default now()
);

-- Pre-approval requests (the ADE Google Form gate before ClassWallet). ClearClaim
-- has NO integration with the Department; status is entirely parent-entered.
create table if not exists preapprovals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  students text,              -- one form can list multiple students (shared expense)
  grade text,
  description text,           -- short, field 5
  cost text,                  -- item price the parent will enter
  justification text,         -- field 7 text
  link text,                  -- optional supporting link
  status text default 'draft',-- draft | submitted | approved | denied
  submitted_date date,
  decision_date date,
  notes text,
  created_at timestamptz default now()
);

-- Account profile: roles (parent and/or provider) plus a provider's business
-- details for branded course documents. One row per user.
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_parent boolean not null default true,
  is_provider boolean not null default false,
  business_name text,
  service_name text,
  provider_name text,
  credentials text,
  contact_email text,
  contact_phone text,
  contact_website text,
  logo_path text,                 -- object path in the 'documents' bucket, under ${user_id}/branding/
  created_at timestamptz default now()
);

-- Mark syllabi created in the provider view (branded letterhead) so they stay
-- separate from a parent's course syllabi.
alter table syllabi add column if not exists branded boolean default false;

-- Paid entitlements: which tiers an account has and until when. Deliberately
-- NOT writable by the user (no insert/update/delete policy) so nobody can grant
-- themselves premium via the API. Only the redeem_code function (security
-- definer), the admin (service role), or a future Stripe webhook change it.
create table if not exists entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  family_until date,
  provider_until date,
  updated_at timestamptz default now()
);

-- Access / comp codes you hand out for free access. Only the service role
-- (admin) and the redeem function ever read these; users never see the list.
create table if not exists access_codes (
  code text primary key,
  grants text not null default 'family',    -- family | provider | both
  months int not null default 12,
  max_uses int,                              -- null = unlimited
  uses int not null default 0,
  expires_at date,
  note text,
  active boolean not null default true,
  created_at timestamptz default now()
);
create table if not exists code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (code, user_id)
);

-- Redeem a code as the signed-in user. Security definer so it can read the code
-- table and write entitlements that the user's own role cannot touch.
create or replace function redeem_code(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare c access_codes; uid uuid := auth.uid(); addf boolean; addp boolean;
begin
  if uid is null then return 'You must be signed in.'; end if;
  select * into c from access_codes where lower(code) = lower(p_code) and active = true;
  if c.code is null then return 'That code is not valid.'; end if;
  if c.expires_at is not null and c.expires_at < current_date then return 'That code has expired.'; end if;
  if c.max_uses is not null and c.uses >= c.max_uses then return 'That code has been fully used.'; end if;
  if exists (select 1 from code_redemptions where code = c.code and user_id = uid) then return 'You already redeemed this code.'; end if;

  addf := c.grants in ('family','both');
  addp := c.grants in ('provider','both');

  insert into entitlements (user_id, family_until, provider_until) values (
    uid,
    case when addf then (current_date + (c.months || ' months')::interval)::date else null end,
    case when addp then (current_date + (c.months || ' months')::interval)::date else null end
  )
  on conflict (user_id) do update set
    family_until = case when addf then (greatest(coalesce(entitlements.family_until, current_date), current_date) + (c.months || ' months')::interval)::date else entitlements.family_until end,
    provider_until = case when addp then (greatest(coalesce(entitlements.provider_until, current_date), current_date) + (c.months || ' months')::interval)::date else entitlements.provider_until end,
    updated_at = now();

  update access_codes set uses = uses + 1 where code = c.code;
  insert into code_redemptions (code, user_id) values (c.code, uid);
  return 'Success — your access is unlocked.';
end; $$;
revoke execute on function redeem_code(text) from public, anon;
grant execute on function redeem_code(text) to authenticated;

-- Extra provider fields: the free-text list of services they offer.
alter table profiles add column if not exists services text;

-- Provider class roster. Each class holds its students inline as jsonb:
-- [{ student_name, family_name, contact }].
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  service text,
  term text,
  students jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now()
);

-- Provider saved menu: products/services a vendor can drop into an invoice
-- without retyping. Just a name and a default price.
create table if not exists provider_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unit_price numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Provider invoices, saved so the vendor keeps a record and can reprint.
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_no text,
  student_name text,
  parent_name text,
  invoice_date date,
  items jsonb default '[]'::jsonb,      -- [{ desc, qty, unit_price }]
  notes text,
  shipping numeric(10,2) default 0,
  tax numeric(10,2) default 0,
  total numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Receipt vault: a sorted "shoebox" of receipts, filed by student (or shared),
-- with a status so parents can see what's been claimed. Files live in the
-- 'documents' bucket under ${user_id}/receipts/.
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kid_id uuid references kids(id) on delete set null,   -- single student (kept for grouping/claim prefill)
  kid_ids jsonb default '[]'::jsonb,                     -- one or more students this receipt covers
  shared boolean default false,
  vendor text,
  category text,
  receipt_date date,
  amount numeric(10,2),
  status text default 'unfiled',                         -- unfiled | claimed | submitted | approved | denied
  note text,
  path text,
  filename text,
  created_at timestamptz default now()
);
-- If the receipts table already exists, add the multi-student column:
alter table receipts add column if not exists kid_ids jsonb default '[]'::jsonb;

-- Homeschool compliance tracker: which yearly items a family has completed.
-- One row per (user, item, school year). Presence with done=true = completed.
create table if not exists compliance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  school_year text not null,
  done boolean not null default true,
  done_date date,
  created_at timestamptz default now(),
  unique (user_id, item_key, school_year)
);

alter table profiles    enable row level security;
alter table entitlements enable row level security;
alter table access_codes enable row level security;
alter table code_redemptions enable row level security;
alter table compliance  enable row level security;
alter table classes     enable row level security;
alter table provider_items enable row level security;
alter table invoices    enable row level security;
alter table receipts    enable row level security;
alter table kids        enable row level security;
alter table vendors     enable row level security;
alter table claims      enable row level security;
alter table syllabi     enable row level security;
alter table documents   enable row level security;
alter table preapprovals enable row level security;

-- owner-only access
create policy "own profile" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Entitlements: users may READ their own, but not write (no write policy on purpose).
create policy "read own entitlements" on entitlements for select using (auth.uid() = user_id);
-- access_codes: no policy at all => only the service role can read/write; users can't enumerate codes.
create policy "read own redemptions" on code_redemptions for select using (auth.uid() = user_id);
create policy "own compliance" on compliance for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own classes" on classes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own provider_items" on provider_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own invoices" on invoices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own receipts" on receipts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own kids"    on kids    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own vendors" on vendors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own claims"  on claims  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own syllabi" on syllabi for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own documents" on documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own preapprovals" on preapprovals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage: create a PRIVATE bucket named 'documents' in the dashboard, then run
-- these so each user can only touch files under a top-level folder named for their uid
-- (the app uploads to `${user_id}/${claim_id}/filename`).
create policy "own docs read"   on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own docs insert" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own docs update" on storage.objects for update
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own docs delete" on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
