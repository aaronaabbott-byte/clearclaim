-- OPTIONAL: auto-purge claims (and their uploaded files) older than 30 days.
--
-- Ann's request: keep claims editable for a window, then clear them so storage
-- doesn't grow forever. This deletes claims whose created_at is older than 30
-- days, along with the files they stored in the "documents" bucket.
--
-- Run this whole file once in the Supabase SQL editor. It:
--   1) creates a function that removes old claims' storage objects, then the rows
--   2) schedules it to run daily at 3:15am UTC via pg_cron
--
-- Adjust the retention window by changing '30 days' in the function.
-- To use a different window (e.g. 15 days), replace both the comment and the interval.

-- Requires the pg_cron extension (Supabase: Database > Extensions > enable "pg_cron").
create extension if not exists pg_cron;

create or replace function public.purge_old_claims()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  cutoff timestamptz := now() - interval '30 days';
begin
  -- Remove the storage objects attached to expiring claims. claims.files is a
  -- jsonb array of { path, kind, name }; pull each path and delete the object.
  delete from storage.objects o
  using public.claims c,
       lateral jsonb_array_elements(coalesce(c.files, '[]'::jsonb)) f
  where c.created_at < cutoff
    and o.bucket_id = 'documents'
    and o.name = (f->>'path');

  -- Then remove the claim rows themselves.
  delete from public.claims
  where created_at < cutoff;
end;
$$;

-- Schedule: every day at 03:15 UTC. Unschedule first so re-running is safe.
select cron.unschedule('purge_old_claims')
where exists (select 1 from cron.job where jobname = 'purge_old_claims');

select cron.schedule('purge_old_claims', '15 3 * * *', $$select public.purge_old_claims();$$);

-- To run it once right now (optional): select public.purge_old_claims();
-- To stop the schedule later:          select cron.unschedule('purge_old_claims');
