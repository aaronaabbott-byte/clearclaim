-- Curriculum-document upgrade: teaching methods / lesson plans / activities.
-- Required for Arizona ESA curriculum documentation; strengthens Arkansas too.
alter table syllabi add column if not exists methods text;
