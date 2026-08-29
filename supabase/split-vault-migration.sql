-- Split reimbursements. Vault reuses the existing `documents` table, so no new
-- table is needed there. Run in the Supabase SQL editor.

-- Group the per-student claims that came from one split receipt, and store the
-- human-readable breakdown so it can be shown to the reviewer on every packet.
alter table claims add column if not exists split_group uuid;
alter table claims add column if not exists split_note  text;

create index if not exists claims_split_group_idx on claims (split_group);
