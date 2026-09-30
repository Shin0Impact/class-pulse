-- Class feedback (the stars + comment at the end of a class), so it appears in the class report.
-- Needs schema.sql / 001_accounts.sql first. Safe to run more than once.
-- Run it: Supabase dashboard > SQL Editor > New query > paste > Run.
-- (A brand-new database only needs schema.sql, which already includes this.)

create table if not exists class_feedback (
  id          uuid primary key,
  session_id  uuid not null references sessions(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text not null default '',
  anonymous   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (session_id, student_id)
);
