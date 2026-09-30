import { supabase } from '../db/supabase.ts';
import { calibrationFor } from './calibration.ts';
import { quadrantFor } from './quadrant.ts';
import { UserError } from './sessionService.ts';
import type {
  CalibrationStats,
  ClassConfusionSummary,
  ClassAnswer,
  ClassDetail,
  ClassFeedbackEntry,
  ClassListItem,
  ClassQuestion,
  Confidence,
  PublicQuestionOption,
  QuadrantCounts,
  StudentProgress,
} from '../../../shared/types.ts';

// Past classes and progress, read back from the database. The live classroom never reads from
// here. The top half is plain functions over rows (unit-tested in historyService.test.ts); the
// bottom half runs the queries and hands the rows to them.

// A class id that doesn't exist or isn't this teacher's. HTTP routes turn it into a 404.
export class NotFoundError extends UserError {}

// ---- row shapes, as selected below ----
export type SessionRow = {
  id: string;
  code: string;
  title: string;
  status: string;
  created_at: string;
  ended_at: string | null;
};
export type StudentRow = { id: string; session_id: string; name: string; user_id: string | null };
export type QuestionRow = {
  id: string;
  session_id: string;
  kind?: string | null; // "open" or mcq (null/undefined on rows from before open questions)
  source?: string | null;
  topic: string;
  prompt: string;
  options: PublicQuestionOption[];
  correct_option_id: string;
  started_at: string;
};
export type AnswerRow = {
  question_id: string;
  student_id: string;
  round: number;
  option_id: string;
  confidence: Confidence;
  correct: boolean;
  answer_text?: string | null;
};
export type FeedbackRow = {
  student_id: string;
  rating: number;
  comment: string | null;
  anonymous: boolean;
  created_at: string;
};
export type SummaryRow = { question_id: string; summary: ClassConfusionSummary; created_at: string };
export type CheckInRow = {
  topic: string;
  started_at: string;
  ended_at: string | null;
  green: number | null;
  yellow: number | null;
  red: number | null;
  unmarked: number | null;
  pct: number | null;
};

// ---- pure aggregation ----

const pct = (part: number, whole: number) => (whole === 0 ? null : Math.round((part / whole) * 100));

const isBlindspot = (a: AnswerRow) => quadrantFor(a.correct, a.confidence) === 'blindspot';
const isOpen = (q: QuestionRow) => q.kind === 'open';

// Open questions have no right answer: their answers never count toward accuracy or calibration.
function gradedOnly(answers: AnswerRow[], questions: QuestionRow[]): AnswerRow[] {
  const open = new Set(questions.filter(isOpen).map((q) => q.id));
  return open.size === 0 ? answers : answers.filter((a) => !open.has(a.question_id));
}

export function statsFor(answers: AnswerRow[]): CalibrationStats {
  return { answered: answers.length, ...calibrationFor(answers) };
}

function emptyCounts(): QuadrantCounts {
  return { mastered: 0, fragile: 0, blindspot: 0, aware: 0 };
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function summarizeClassList(
  sessions: SessionRow[],
  students: StudentRow[],
  questions: QuestionRow[],
  firstAnswers: AnswerRow[],
): ClassListItem[] {
  const studentsBySession = groupBy(students, (s) => s.session_id);
  const questionsBySession = groupBy(questions, (q) => q.session_id);
  const sessionOfQuestion = new Map(questions.map((q) => [q.id, q.session_id]));
  const answersBySession = groupBy(
    gradedOnly(firstAnswers, questions).filter((a) => a.round === 1),
    (a) => sessionOfQuestion.get(a.question_id),
  );

  return sessions.map((s) => {
    const answers = answersBySession.get(s.id) ?? [];
    return {
      id: s.id,
      code: s.code,
      title: s.title,
      status: s.status,
      createdAt: s.created_at,
      endedAt: s.ended_at,
      studentCount: studentsBySession.get(s.id)?.length ?? 0,
      questionCount: questionsBySession.get(s.id)?.length ?? 0,
      firstTryAccuracy: pct(answers.filter((a) => a.correct).length, answers.length),
      blindspotCount: answers.filter(isBlindspot).length,
    };
  });
}

export function summarizeClass(
  session: SessionRow,
  students: StudentRow[],
  questions: QuestionRow[],
  answers: AnswerRow[],
  checkIns: CheckInRow[],
  summaries: SummaryRow[] = [],
  feedbackRows: FeedbackRow[] = [],
): ClassDetail {
  const firstAnswers = gradedOnly(answers, questions).filter((a) => a.round === 1);
  const nameById = new Map(students.map((s) => [s.id, s.name]));
  const newestSummary = new Map<string, ClassConfusionSummary>();
  for (const row of [...summaries].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    newestSummary.set(row.question_id, row.summary);
  }
  const firstByStudent = groupBy(firstAnswers, (a) => a.student_id);
  const answersByQuestion = groupBy(answers, (a) => a.question_id);

  const classStudents = students
    .map((s) => {
      const mine = firstByStudent.get(s.id) ?? [];
      return {
        id: s.id,
        name: s.name,
        signedIn: s.user_id !== null,
        ...statsFor(mine),
        blindspots: mine.filter(isBlindspot).length,
      };
    })
    // most confidently-wrong first: those are the students the teacher should look at
    .sort((a, b) => b.blindspots - a.blindspots || (a.accuracy ?? 101) - (b.accuracy ?? 101) || a.name.localeCompare(b.name));

  const classQuestions: ClassQuestion[] = [...questions]
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .map((q) => {
      const all = answersByQuestion.get(q.id) ?? [];
      const byRound = groupBy(all, (a) => a.round);
      const optionCounts: Record<string, number> = Object.fromEntries(q.options.map((o) => [o.id, 0]));
      for (const a of byRound.get(1) ?? []) optionCounts[a.option_id] = (optionCounts[a.option_id] ?? 0) + 1;

      if (isOpen(q)) {
        return {
          id: q.id,
          kind: 'open' as const,
          source: q.source ?? 'deck',
          topic: q.topic,
          prompt: q.prompt,
          startedAt: q.started_at,
          options: [],
          correctOptionId: '',
          optionCounts: {},
          answers: [],
          rounds: [],
          openAnswers: (byRound.get(1) ?? [])
            .filter((a) => a.answer_text)
            .map((a) => ({ name: nameById.get(a.student_id) ?? '?', text: a.answer_text as string, confidence: a.confidence })),
          summary: newestSummary.get(q.id) ?? null,
        };
      }

      const rounds = [...byRound.keys()]
        .sort((a, b) => a - b)
        .map((round) => {
          const list = byRound.get(round) ?? [];
          const counts = emptyCounts();
          for (const a of list) counts[quadrantFor(a.correct, a.confidence)]++;
          return {
            round,
            answered: list.length,
            correctPct: pct(list.filter((a) => a.correct).length, list.length),
            counts,
          };
        });

      return {
        id: q.id,
        kind: 'mcq' as const,
        source: q.source ?? 'deck',
        topic: q.topic,
        prompt: q.prompt,
        startedAt: q.started_at,
        options: q.options,
        correctOptionId: q.correct_option_id,
        optionCounts,
        answers: (byRound.get(1) ?? [])
          .map((a): ClassAnswer => ({
            name: nameById.get(a.student_id) ?? '?',
            optionId: a.option_id,
            confidence: a.confidence,
            correct: a.correct,
            quadrant: quadrantFor(a.correct, a.confidence),
          }))
          // wrong answers first (the ones to follow up), the confidently wrong at the very top
          .sort((a, b) => Number(a.correct) - Number(b.correct) || Number(b.quadrant === 'blindspot') - Number(a.quadrant === 'blindspot') || a.name.localeCompare(b.name)),
        rounds,
        openAnswers: [],
        summary: newestSummary.get(q.id) ?? null,
      };
    });

  const overall = calibrationFor(firstAnswers);

  const feedbackItems: ClassFeedbackEntry[] = [...feedbackRows]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((f) => ({
      rating: f.rating,
      comment: f.comment ?? '',
      // someone who chose "anonymous" stays anonymous here too
      name: f.anonymous ? null : (nameById.get(f.student_id) ?? null),
      createdAt: f.created_at,
    }));

  return {
    id: session.id,
    code: session.code,
    title: session.title,
    status: session.status,
    createdAt: session.created_at,
    endedAt: session.ended_at,
    totals: {
      students: students.length,
      questions: questions.length,
      answers: firstAnswers.length,
      firstTryAccuracy: overall.accuracy,
      illusionGap: overall.illusionGap,
    },
    students: classStudents,
    questions: classQuestions,
    checkIns: [...checkIns]
      // like the live dashboard's history: a check-in nobody marked isn't worth showing
      .filter((c) => (c.green ?? 0) + (c.yellow ?? 0) + (c.red ?? 0) > 0)
      .sort((a, b) => a.started_at.localeCompare(b.started_at))
      .map((c) => ({
        topic: c.topic,
        startedAt: c.started_at,
        endedAt: c.ended_at,
        pct: c.pct,
        green: c.green ?? 0,
        yellow: c.yellow ?? 0,
        red: c.red ?? 0,
        unmarked: c.unmarked ?? 0,
      })),
    feedback: {
      responses: feedbackItems.length,
      average: feedbackItems.length
        ? Math.round((feedbackItems.reduce((sum, f) => sum + f.rating, 0) / feedbackItems.length) * 10) / 10
        : null,
      items: feedbackItems,
    },
  };
}

export function summarizeProgress(
  sessions: SessionRow[],
  myStudents: StudentRow[],
  questions: QuestionRow[],
  answers: AnswerRow[],
): StudentProgress {
  const first = gradedOnly(answers, questions).filter((a) => a.round === 1);
  const sessionOfStudent = new Map(myStudents.map((s) => [s.id, s.session_id]));
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const bySession = groupBy(first, (a) => sessionOfStudent.get(a.student_id));

  const classes = [...sessions]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((s) => ({
      sessionId: s.id,
      title: s.title,
      date: s.created_at,
      ...statsFor(bySession.get(s.id) ?? []),
    }))
    .filter((c) => c.answered > 0);

  const byTopic = groupBy(first, (a) => questionById.get(a.question_id)?.topic.trim() || '');
  const topics = [...byTopic.entries()]
    .map(([topic, list]) => ({
      topic,
      answered: list.length,
      accuracy: pct(list.filter((a) => a.correct).length, list.length),
      blindspots: list.filter(isBlindspot).length,
    }))
    .sort((a, b) => b.answered - a.answered || a.topic.localeCompare(b.topic));

  return { overall: statsFor(first), classes, topics };
}

// ---- queries ----

function db() {
  if (!supabase) throw new UserError('History is not available: the server has no database configured.');
  return supabase;
}

// Supabase returns { data, error }; this unwraps it so a failed query throws like any other bug.
async function rows<T>(label: string, query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return (data ?? []) as T[];
}

type Pageable = {
  range(from: number, to: number): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

// PostgREST answers at most max-rows rows per request (1000 by default, maybe less), silently
// cutting the rest, and a long `in (...)` id list can overflow the URL. So: split the ids into
// chunks and page through each until an empty page -- a short page only means "the server's
// cap", not "the end". `build` must order by a unique column so pages don't overlap.
const PAGE = 1000;
const CHUNK = 100;

async function rowsIn<T>(label: string, ids: string[], build: (chunk: string[]) => Pageable): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    for (let from = 0; ; ) {
      const page = await rows<T>(label, build(chunk).range(from, from + PAGE - 1));
      if (page.length === 0) break;
      out.push(...page);
      from += page.length;
    }
  }
  return out;
}

const SESSION_COLS = 'id, code, title, status, created_at, ended_at';
const STUDENT_COLS = 'id, session_id, name, user_id';
const QUESTION_COLS = 'id, session_id, kind, source, topic, prompt, options, correct_option_id, started_at';
const ANSWER_COLS = 'question_id, student_id, round, option_id, confidence, correct, answer_text';

export async function teacherClasses(teacherId: string): Promise<ClassListItem[]> {
  const sessions = await rows<SessionRow>(
    'classes',
    db().from('sessions').select(SESSION_COLS).eq('teacher_id', teacherId).order('created_at', { ascending: false }).limit(100),
  );
  const ids = sessions.map((s) => s.id);
  if (ids.length === 0) return [];

  const [students, questions] = await Promise.all([
    rowsIn<StudentRow>('students', ids, (c) => db().from('students').select(STUDENT_COLS).in('session_id', c).order('id')),
    rowsIn<QuestionRow>('questions', ids, (c) => db().from('blindspot_questions').select(QUESTION_COLS).in('session_id', c).order('id')),
  ]);
  const answers = await rowsIn<AnswerRow>('answers', questions.map((q) => q.id), (c) =>
    db().from('blindspot_answers').select(ANSWER_COLS).in('question_id', c).eq('round', 1).order('id'),
  );

  return summarizeClassList(sessions, students, questions, answers);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function teacherClass(teacherId: string, sessionId: string): Promise<ClassDetail> {
  if (!UUID.test(sessionId)) throw new NotFoundError('Class not found');
  const { data: session, error } = await db()
    .from('sessions')
    .select(`${SESSION_COLS}, teacher_id`)
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw new Error(`class: ${error.message}`);
  // Same answer for "doesn't exist" and "not yours", so ids can't be probed.
  if (!session || session.teacher_id !== teacherId) throw new NotFoundError('Class not found');

  const one = [sessionId];
  const [students, questions, checkIns] = await Promise.all([
    rowsIn<StudentRow>('students', one, (c) => db().from('students').select(STUDENT_COLS).in('session_id', c).order('id')),
    rowsIn<QuestionRow>('questions', one, (c) => db().from('blindspot_questions').select(QUESTION_COLS).in('session_id', c).order('id')),
    rowsIn<CheckInRow>('check-ins', one, (c) =>
      db().from('checkins').select('topic, started_at, ended_at, green, yellow, red, unmarked, pct').in('session_id', c).order('id'),
    ),
  ]);
  const questionIds = questions.map((q) => q.id);
  const [answers, summaries, feedback] = await Promise.all([
    rowsIn<AnswerRow>('answers', questionIds, (c) =>
      db().from('blindspot_answers').select(ANSWER_COLS).in('question_id', c).order('id'),
    ),
    rowsIn<SummaryRow>('summaries', questionIds, (c) =>
      db().from('ai_summaries').select('question_id, summary, created_at').in('question_id', c).order('id'),
    ),
    // Feedback is optional: if the table has not been created yet (migration 003), the report just has none.
    rowsIn<FeedbackRow>('feedback', one, (c) =>
      db().from('class_feedback').select('student_id, rating, comment, anonymous, created_at').in('session_id', c).order('id'),
    ).catch((e: unknown) => {
      console.error('[db] feedback not loaded:', e instanceof Error ? e.message : e);
      return [] as FeedbackRow[];
    }),
  ]);

  return summarizeClass(session as SessionRow, students, questions, answers, checkIns, summaries, feedback);
}

export async function studentProgress(userId: string): Promise<StudentProgress> {
  const myStudents = await rowsIn<StudentRow>('my students', [userId], (c) =>
    db().from('students').select(STUDENT_COLS).in('user_id', c).order('id'),
  );
  if (myStudents.length === 0) return summarizeProgress([], [], [], []);

  const sessionIds = [...new Set(myStudents.map((s) => s.session_id))];
  const [sessions, answers] = await Promise.all([
    rowsIn<SessionRow>('sessions', sessionIds, (c) => db().from('sessions').select(SESSION_COLS).in('id', c).order('id')),
    rowsIn<AnswerRow>('answers', myStudents.map((s) => s.id), (c) =>
      db().from('blindspot_answers').select(ANSWER_COLS).in('student_id', c).eq('round', 1).order('id'),
    ),
  ]);
  const questionIds = [...new Set(answers.map((a) => a.question_id))];
  const questions = await rowsIn<QuestionRow>('questions', questionIds, (c) =>
    db().from('blindspot_questions').select(QUESTION_COLS).in('id', c).order('id'),
  );

  return summarizeProgress(sessions, myStudents, questions, answers);
}
