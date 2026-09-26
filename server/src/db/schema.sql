-- Class Pulse schema for Supabase (Postgres).
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- The server generates the UUIDs itself, so inserts never need a read-back.
-- If you ran an OLDER version of this file (with a "checks" / "answers" table), run the DROP block first.

-- drop table if exists teachback_sessions, answers, checks, status_events, checkins, students, sessions cascade;

create table if not exists sessions (
  id          uuid primary key,
  code        text not null,
  title       text not null default '',
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create table if not exists students (
  id          uuid primary key,
  session_id  uuid not null references sessions(id) on delete cascade,
  name        text not null,
  joined_at   timestamptz not null default now()
);

-- One check-in = one stretch of teaching on a topic, ended when the teacher taps "Check in now" again.
create table if not exists checkins (
  id          uuid primary key,
  session_id  uuid not null references sessions(id) on delete cascade,
  topic       text not null default '',
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  green       int,
  yellow      int,
  red         int,
  unmarked    int,
  pct         int          -- class understanding %, null if nobody marked
);

-- Every color change (kept so the timeline can be rebuilt after class).
create table if not exists status_events (
  id          uuid primary key,
  checkin_id  uuid not null references checkins(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  status      text not null,           -- green | yellow | red
  reason      text,                    -- too-fast | unclear-steps | need-example | missing-basics
  created_at  timestamptz not null default now()
);

create index if not exists idx_sessions_code on sessions(code);
create index if not exists idx_checkins_session on checkins(session_id);
create index if not exists idx_status_checkin on status_events(checkin_id);

-- Lock the tables down: only the server (service_role key, which bypasses RLS) can read or write.
-- The browser never talks to Supabase directly, so no policies are needed.
alter table sessions      enable row level security;
alter table students      enable row level security;
alter table checkins      enable row level security;
alter table status_events enable row level security;
