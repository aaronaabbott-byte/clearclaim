-- Supporting documents for pre-approval requests.
-- The ADE pre-approval Google Form can't take file uploads, only links. So
-- families upload their supporting docs (a therapist/provider note, a curriculum
-- or supply list, an item page) in ClearClaim, generate a shareable link for each,
-- and paste those links into the form. This stores the file references on the row.
--
-- Run once in the Supabase SQL editor. Files reuse the existing "documents"
-- bucket; its per-user folder policies already cover paths under {user_id}/...,
-- so no new storage policy is needed.

alter table preapprovals add column if not exists files jsonb default '[]'::jsonb;  -- [{ path, name, kind }]
