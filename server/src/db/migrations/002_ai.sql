-- AI: open questions, where a question came from, AI class-confusion summaries, and teachers'
-- lesson files. Needs 001_accounts.sql first. Safe to run more than once.
-- Run it: Supabase dashboard > SQL Editor > New query > paste > Run.
-- (A brand-new database only needs schema.sql, which already includes all of this.)

-- mcq = multiple choice (has a right answer); open = answered in words (no right answer).
alter table blindspot_questions add column if not exists kind    text not null default 'mcq';
-- deck | ai | teacher
alter table blindspot_questions add column if not exists source  text not null default 'deck';
-- { documentName, page, excerpt }: the lesson page an AI question was asked about
alter table blindspot_questions add column if not exists context jsonb;

-- An open question's written answer (option_id is '' and correct is false for those).
alter table blindspot_answers add column if not exists answer_text text;

-- One row per AI summary of a question's answers (the teacher can ask again; newest wins).
create table if not exists ai_summaries (
  id           uuid primary key,
  question_id  uuid not null references blindspot_questions(id) on delete cascade,
  round        int not null default 1,
  answered     int not null,
  summary      jsonb not null,   -- ClassConfusionSummary: headline, confusions[], reteach, suggestion
  provider     text not null,    -- which AI model wrote it
  created_at   timestamptz not null default now()
);

-- A teacher's uploaded lesson files. The bytes live in the private Storage bucket "documents"
-- (the server creates it on first upload).
create table if not exists documents (
  id            uuid primary key,
  teacher_id    uuid not null references profiles(id) on delete cascade,
  name          text not null,
  mime          text not null,
  size          int not null,
  storage_path  text not null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now()
);

create index if not exists idx_ai_summaries_question on ai_summaries(question_id);
create index if not exists idx_documents_teacher on documents(teacher_id, last_used_at desc);

alter table ai_summaries enable row level security;
alter table documents    enable row level security;
