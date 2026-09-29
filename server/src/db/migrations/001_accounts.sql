-- Accounts: teacher and student profiles, and who owns each class / which account each student is.
-- For a database created from an OLDER schema.sql. Safe to run more than once.
-- Run it: Supabase dashboard > SQL Editor > New query > paste > Run.
-- (A brand-new database only needs schema.sql, which already includes all of this.)

-- One row per account. The login itself (email + password) lives in Supabase Auth (auth.users);
-- the server creates this row right after creating the login, on sign-up.
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('teacher', 'student')),
  display_name  text not null,
  created_at    timestamptz not null default now()
);

-- The teacher who ran the class (null for classes from before accounts existed).
alter table sessions add column if not exists teacher_id uuid references profiles(id) on delete set null;

-- The student's account, when they joined signed in (null for a guest join).
alter table students add column if not exists user_id uuid references profiles(id) on delete set null;

create index if not exists idx_sessions_teacher on sessions(teacher_id);
create index if not exists idx_students_user on students(user_id);

alter table profiles enable row level security;
