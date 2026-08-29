-- Multi-state: which program's rulebook an account follows.
-- Existing users default to Arkansas so nothing changes for them.
alter table profiles add column if not exists state text not null default 'AR';
