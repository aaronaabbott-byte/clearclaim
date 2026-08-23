-- ClearClaim — administrative user reset
-- ---------------------------------------------------------------------------
-- Purpose: let testers try the app with real past ClassWallet purchases, then
-- wipe their data clean so they can start fresh for real use. This KEEPS the
-- login (auth account), so the tester does not have to re-register — it only
-- deletes the data they created: students, claims, pre-approvals, syllabi,
-- documents, vendors, and their uploaded files in storage.
--
-- Run this whole file ONCE in the Supabase SQL editor to create the function.
-- After that, reset any tester by email whenever you need to:
--
--     select reset_user_data('tester@example.com');
--
-- It returns a one-line summary of what it cleared. Safe to run repeatedly.
-- Only run it in the SQL editor (owner role); it is not exposed to the app.
-- ---------------------------------------------------------------------------

create or replace function reset_user_data(target_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  n_kids int; n_claims int; n_pre int; n_syl int; n_doc int; n_ven int; n_obj int;
begin
  select id into uid from auth.users where lower(email) = lower(target_email);
  if uid is null then
    return format('No user found for %s. Nothing changed.', target_email);
  end if;

  -- Uploaded files first (documents storage bucket, foldered by user id).
  delete from storage.objects
   where bucket_id = 'documents'
     and (storage.foldername(name))[1] = uid::text;
  get diagnostics n_obj = row_count;

  delete from claims       where user_id = uid;  get diagnostics n_claims = row_count;
  delete from preapprovals where user_id = uid;  get diagnostics n_pre    = row_count;
  delete from syllabi      where user_id = uid;  get diagnostics n_syl    = row_count;
  delete from documents    where user_id = uid;  get diagnostics n_doc    = row_count;
  delete from vendors      where user_id = uid;  get diagnostics n_ven    = row_count;
  delete from kids         where user_id = uid;  get diagnostics n_kids   = row_count;

  return format(
    'Reset %s (login kept). Cleared: %s students, %s claims, %s pre-approvals, %s syllabi, %s documents, %s vendors, %s files.',
    target_email, n_kids, n_claims, n_pre, n_syl, n_doc, n_ven, n_obj);
end;
$$;

-- Optional: fully remove a tester, account and all, so the email can start over
-- as a brand-new signup. This deletes the auth login too (cascades to their
-- data). Uncomment to create it, then: select delete_user_completely('x@y.com');
--
-- create or replace function delete_user_completely(target_email text)
-- returns text language plpgsql security definer set search_path = public, auth as $$
-- declare uid uuid;
-- begin
--   select id into uid from auth.users where lower(email) = lower(target_email);
--   if uid is null then return format('No user found for %s.', target_email); end if;
--   delete from storage.objects where bucket_id = 'documents' and (storage.foldername(name))[1] = uid::text;
--   delete from auth.users where id = uid;  -- cascades to app tables via on delete cascade
--   return format('Deleted account and all data for %s.', target_email);
-- end; $$;
