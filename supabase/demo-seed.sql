-- ClearClaim — one-click demo reset + seed.
-- ---------------------------------------------------------------------------
-- Creates reset_demo(): wipes the demo account's data and seeds a fresh,
-- consistent demo — an Arizona (ESA) account with two students, a curriculum
-- document, a branded provider document, and a sample claim, plus full premium
-- so every feature is unlocked. Flip the map to Arkansas in the demo to show
-- that side too.
--
-- SETUP (once):
--   1. Sign up a normal account with email  demo@clearclaimapp.com
--   2. Run this whole file in the Supabase SQL editor.
-- Then reset any time: the "Reset demo" button on that account's dashboard
-- calls it, or run  select reset_demo();  in the SQL editor.
--
-- Safe: the function only ever touches the demo account. A different signed-in
-- user who calls it just gets "Not the demo account."
-- ---------------------------------------------------------------------------

create or replace function reset_demo()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  demo_email text := 'demo@clearclaimapp.com';
  uid uuid;
  ava uuid;
  liam uuid;
begin
  select id into uid from auth.users where lower(email) = demo_email;
  if uid is null then
    return 'Demo account not found — sign up ' || demo_email || ' first, then run this.';
  end if;
  -- Only the demo user (via the app) or the SQL editor owner (auth.uid() null) may run it.
  if auth.uid() is not null and auth.uid() <> uid then
    return 'Not the demo account. Nothing changed.';
  end if;

  -- Wipe everything the demo created.
  delete from storage.objects where bucket_id = 'documents' and (storage.foldername(name))[1] = uid::text;
  delete from claims       where user_id = uid;
  delete from cap_entries  where user_id = uid;
  delete from preapprovals where user_id = uid;
  delete from syllabi      where user_id = uid;
  delete from documents    where user_id = uid;
  delete from invoices     where user_id = uid;
  delete from classes      where user_id = uid;
  delete from provider_items where user_id = uid;
  delete from compliance   where user_id = uid;
  delete from vendors      where user_id = uid;
  delete from kids         where user_id = uid;

  -- Full premium so every feature is unlocked in the demo.
  insert into entitlements (user_id, family_until, provider_until)
    values (uid, current_date + 365, current_date + 365)
  on conflict (user_id) do update
    set family_until = excluded.family_until, provider_until = excluded.provider_until;

  -- Arizona account, parent + provider, with a business profile for the provider view.
  update profiles set
    state = 'AZ', is_parent = true, is_provider = true,
    business_name = 'Bright Path Learning', provider_name = 'Jordan Rivera',
    credentials = 'M.Ed.', services = 'Latin, Math, Writing',
    contact_email = 'hello@brightpath.example', contact_phone = '555-0100'
  where user_id = uid;

  -- Two students.
  insert into kids (user_id, first_name, grade, setting, subjects, funding_tier, sort_order)
    values (uid, 'Ava', '5', 'homeschool', 'Latin, Math, Science', 'standard', 0) returning id into ava;
  insert into kids (user_id, first_name, grade, setting, subjects, funding_tier, sort_order)
    values (uid, 'Liam', '2', 'homeschool', 'Reading, Math', 'standard', 1) returning id into liam;

  -- A curriculum document (parent syllabus, with the new methods section).
  insert into syllabi (user_id, kid_id, title, subject, grade, term, level, weeks, sessions_per_week,
    instructor, description, objectives, methods, standards, materials, schedule, assessment, status, branded)
  values (uid, ava, '5th-Grade Latin', 'World Languages', '5', '2026-27', 'Beginner', '18', '3', 'Parent',
    'A beginner Latin course that builds vocabulary, grammar, and reading through sequential lessons.',
    'By the end of the course the student can read simple Latin sentences, decline first- and second-declension nouns, and conjugate present-tense verbs.',
    'Lessons follow a consistent format: review of prior material, direct instruction of the new concept, guided practice, and independent work. Activities include readings, workbook exercises, flashcard drills, and short translation projects. The required materials below are used directly in these lessons.',
    'Aligned to grade 5 world-language skills and subject-area standards.',
    'Latin for Children Primer A, the matching workbook, and flashcards.',
    'Weeks 1-3: foundations and vocabulary. Weeks 4-9: core grammar units. Weeks 10-15: application and translation. Weeks 16-18: review and assessment.',
    'Weekly assignments, unit quizzes, a translation project, and an end-of-term assessment, kept in a portfolio.',
    'final', false);

  -- A branded provider course document for the provider view.
  insert into syllabi (user_id, kid_id, title, subject, grade, term, level, instructor,
    description, objectives, methods, materials, status, branded)
  values (uid, null, 'Homeschool Latin Co-op', 'World Languages', '5', '2026-27', 'Beginner', 'Jordan Rivera, M.Ed.',
    'A weekly co-op Latin class for homeschool students.',
    'Students build core Latin vocabulary and grammar and can read simple passages by the end of the term.',
    'Small-group instruction with direct teaching, guided practice, games, and weekly homework.',
    'Latin for Children Primer A and shared classroom materials.',
    'final', true);

  -- A sample claim so the claim list and packet aren''t empty.
  insert into claims (user_id, kid_id, vendor, pathway, amount, date, category, items, purpose, reasoning, status)
  values (uid, ava, 'Rainbow Resource Center', 'reimbursement', 84.20, current_date - 7,
    'Curricula and supplementary material', 'Latin primer, workbook, flashcards',
    'Core Latin curriculum for Ava''s language study.',
    'Ava uses the Latin primer and workbook as the core of daily language lessons, with the flashcards for vocabulary practice.',
    'ready');

  return 'Demo reset ✓ — Arizona account, 2 students, a curriculum document, a provider document, and a sample claim. Full premium unlocked.';
end;
$$;

-- The demo user calls this from the app; the function self-checks identity.
revoke execute on function reset_demo() from public, anon;
grant  execute on function reset_demo() to authenticated, service_role;
