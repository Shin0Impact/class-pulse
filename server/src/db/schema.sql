-- Class Pulse schema for Supabase (Postgres).
-- Run this once: Supabase dashboard > SQL Editor > New query > paste > Run.
-- The server generates the UUIDs itself, so inserts never need a read-back.
-- If you ran an OLDER version of this file (with a "checks" / "answers" table), run the DROP block first.
-- Already ran an older version and just need the newer tables/columns? Run the files in migrations/ instead.

-- drop table if exists blindspot_clarity_ratings, blindspot_pairs, blindspot_answers, blindspot_questions, teachback_sessions, answers, checks, status_events, checkins, students, sessions, profiles cascade;

-- ---- Accounts ----
-- One row per account. The login itself (email + password) lives in Supabase Auth (auth.users);
-- the server creates this row right after creating the login, on sign-up.
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('teacher', 'student')),
  display_name  text not null,
  created_at    timestamptz not null default now()
);

create table if not exists sessions (
  id          uuid primary key,
  code        text not null,
  title       text not null default '',
  status      text not null default 'active',
  teacher_id  uuid references profiles(id) on delete set null,  -- null only for classes run without accounts
  created_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create table if not exists students (
  id          uuid primary key,
  session_id  uuid not null references sessions(id) on delete cascade,
  name        text not null,
  user_id     uuid references profiles(id) on delete set null,  -- the student's account; null for a guest join
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

-- ---- Blindspot ----
-- One row per launched question. The server-generated id here (QuestionRound.dbId) is what every
-- answer/pair/rating below points back to; a teacher:recheck does NOT insert a new row here, it
-- just bumps the "round" column on the child rows (same question, round 2).
create table if not exists blindspot_questions (
  id                 uuid primary key,
  session_id         uuid not null references sessions(id) on delete cascade,
  question_id        text not null,   -- the deck's own question id (not unique across sessions)
  topic              text not null default '',
  prompt             text not null,
  correct_option_id  text not null,
  options            jsonb not null,  -- [{ id, text }] as sent to students
  started_at         timestamptz not null default now()
);

-- One row per student per round. Upserted (same student can change their mind before the round
-- closes), so (question_id, student_id, round) is unique rather than append-only.
create table if not exists blindspot_answers (
  id           uuid primary key,
  question_id  uuid not null references blindspot_questions(id) on delete cascade,
  student_id   uuid not null references students(id) on delete cascade,
  round        int not null default 1,
  option_id    text not null,
  confidence   text not null,   -- guess | fairly-sure | certain
  correct      boolean not null,
  explanation  text,
  created_at   timestamptz not null default now(),
  unique (question_id, student_id, round)
);

-- One row per pair per round, from teacher:pairUp.
create table if not exists blindspot_pairs (
  id                    uuid primary key,
  question_id           uuid not null references blindspot_questions(id) on delete cascade,
  round                 int not null default 1,
  pair_key              text not null,   -- Pair.pairId, so a clarity rating can point back to this pair
  explainer_student_id  uuid not null references students(id) on delete cascade,
  listener_student_id   uuid not null references students(id) on delete cascade,
  created_at            timestamptz not null default now()
);

-- The listener's rating of how clearly their partner explained (student:rateClarity).
create table if not exists blindspot_clarity_ratings (
  id           uuid primary key,
  question_id  uuid not null references blindspot_questions(id) on delete cascade,
  round        int not null default 1,
  pair_key     text not null,
  student_id   uuid not null references students(id) on delete cascade,  -- the listener who rated
  rating       int not null check (rating between 1 and 5),
  created_at   timestamptz not null default now(),
  unique (pair_key, student_id)
);

create index if not exists idx_sessions_code on sessions(code);
create index if not exists idx_sessions_teacher on sessions(teacher_id);
create index if not exists idx_students_user on students(user_id);
create index if not exists idx_checkins_session on checkins(session_id);
create index if not exists idx_status_checkin on status_events(checkin_id);
create index if not exists idx_blindspot_questions_session on blindspot_questions(session_id);
create index if not exists idx_blindspot_answers_question on blindspot_answers(question_id);
create index if not exists idx_blindspot_pairs_question on blindspot_pairs(question_id);
create index if not exists idx_blindspot_clarity_question on blindspot_clarity_ratings(question_id);

-- Lock the tables down: only the server (service_role key, which bypasses RLS) can read or write.
-- The browser never talks to Supabase directly, so no policies are needed.
alter table profiles                  enable row level security;
alter table sessions                  enable row level security;
alter table students                  enable row level security;
alter table checkins                  enable row level security;
alter table status_events             enable row level security;
alter table blindspot_questions       enable row level security;
alter table blindspot_answers         enable row level security;
alter table blindspot_pairs           enable row level security;
alter table blindspot_clarity_ratings enable row level security;
