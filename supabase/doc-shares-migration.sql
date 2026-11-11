-- Send-to-family links for provider invoices and course documents.
--
-- These are generated on the fly (not stored files), so instead of the file-based
-- share_tokens, this maps a random token to a record (an invoice or a syllabus).
-- The public /v/<token> route reads this with the service role and renders the
-- document for the family to view, print, or save as PDF. Permanent until revoked.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists doc_shares (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,            -- invoice | document
  ref_id      uuid not null,            -- invoices.id or syllabi.id
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists doc_shares_user_idx on doc_shares(user_id);
create index if not exists doc_shares_ref_idx on doc_shares(user_id, kind, ref_id);

alter table doc_shares enable row level security;
-- Owners manage their own; the public render route uses the service role (bypasses
-- RLS), so there is intentionally no public read policy here.
drop policy if exists doc_shares_owner_sel on doc_shares;
drop policy if exists doc_shares_owner_ins on doc_shares;
drop policy if exists doc_shares_owner_upd on doc_shares;
create policy doc_shares_owner_sel on doc_shares for select using (auth.uid() = user_id);
create policy doc_shares_owner_ins on doc_shares for insert with check (auth.uid() = user_id);
create policy doc_shares_owner_upd on doc_shares for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
