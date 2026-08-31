-- Web-sourced resources for a course (videos, tutorials, sites), editable by the parent.
alter table syllabi add column if not exists resources text;
