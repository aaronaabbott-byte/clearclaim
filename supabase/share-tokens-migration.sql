-- Branded shareable links for documents.
--
-- The ADE pre-approval Google Form only accepts links (no uploads). Instead of
-- handing out long, ugly Supabase signed URLs that expire in a few months, we
-- mint a short random token and serve the file from our own domain:
--
--     https://clearclaimapp.com/d/<token>
--
-- The link is permanent until the owner revokes it, and the token is random and
-- unguessable. The public /d/<token> route reads this table with the service
-- role (bypassing RLS) and streams the file; nobody can list or enumerate it.
--
-- Run once in the Supabase SQL editor.

create table if not exists share_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  path        text not null,                       -- storage path in the "documents" bucket
  name        text,                                -- friendly filename for download
  kind        text,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists share_tokens_user_idx on share_tokens(user_id);
create index if not exists share_tokens_path_idx on share_tokens(user_id, path);

alter table share_tokens enable row level security;

-- Owners manage only their own share tokens. The public link route does NOT use
-- these policies — it uses the service role — so there is no public read policy
-- here on purpose (the table must not be enumerable by anonymous visitors).
drop policy if exists share_tokens_owner_sel on share_tokens;
drop policy if exists share_tokens_owner_ins on share_tokens;
drop policy if exists share_tokens_owner_upd on share_tokens;
drop policy if exists share_tokens_owner_del on share_tokens;

create policy share_tokens_owner_sel on share_tokens
  for select using (auth.uid() = user_id);
create policy share_tokens_owner_ins on share_tokens
  for insert with check (auth.uid() = user_id);
create policy share_tokens_owner_upd on share_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy share_tokens_owner_del on share_tokens
  for delete using (auth.uid() = user_id);
