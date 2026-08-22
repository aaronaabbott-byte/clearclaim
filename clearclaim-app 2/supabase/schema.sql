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
  created_at timestamptz default now()
);

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
  status text default 'draft',                   -- draft | ready | submitted
  created_at timestamptz default now()
);

alter table kids    enable row level security;
alter table vendors enable row level security;
alter table claims  enable row level security;

-- owner-only access
create policy "own kids"    on kids    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own vendors" on vendors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own claims"  on claims  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage: create a private bucket named 'documents' in the dashboard, then:
-- (policies so each user can only touch files under a folder named after their uid)
-- create policy "own docs read"  on storage.objects for select using (bucket_id='documents' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "own docs write" on storage.objects for insert with check (bucket_id='documents' and (storage.foldername(name))[1] = auth.uid()::text);
