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
-- If the kids table already exists from an earlier version, add the column:
alter table kids add column if not exists funding_tier text not null default 'standard';

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

alter table kids      enable row level security;
alter table vendors   enable row level security;
alter table claims    enable row level security;
alter table syllabi   enable row level security;
alter table documents enable row level security;

-- owner-only access
create policy "own kids"    on kids    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own vendors" on vendors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own claims"  on claims  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own syllabi" on syllabi for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own documents" on documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
