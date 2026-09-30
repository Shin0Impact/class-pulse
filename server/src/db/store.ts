import { randomUUID } from 'node:crypto';
import { supabase } from './supabase.ts';
import type { CheckIn, ClassConfusionSummary, Confidence, Pair, Summary } from '../../../shared/types.ts';
import type { QuestionRound, Session, Student } from '../services/types.ts';

// Persistence layer. Live state stays in memory (see sessionService); this only records history.
// Writes are queued so they hit the database in order (a check-in row exists before its status events),
// and a database problem is logged but NEVER breaks the live classroom.
//
// Every row is built when the write is QUEUED, not when it runs: the live objects keep changing
// (a re-check bumps round.round, a check-in resets every student's color), and a write that read
// them late would record the wrong round or color -- or overwrite a first attempt with the re-check.

let queue: Promise<void> = Promise.resolve();

// Busy moments (30 students tapping at once) would otherwise be 30 separate round trips, one after the
// other, and the queue would fall minutes behind. Consecutive rows for the same table are therefore
// sent as ONE request. Order is kept exactly: any other write first pushes the pending batch onto the
// queue, and a short timer pushes it if nothing else comes.
type Batch = { table: string; rows: Record<string, unknown>[]; upsertOn?: string; key?: (r: Record<string, unknown>) => string };
let pending: Batch[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_MS = 40;

function pushPending(): void {
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = null;
  const batches = pending;
  pending = [];
  for (const b of batches) {
    let rows = b.rows;
    if (b.key) {
      // one statement can't touch the same row twice: keep the newest of each
      const byKey = new Map<string, Record<string, unknown>>();
      for (const r of rows) byKey.set(b.key(r), r);
      rows = [...byKey.values()];
    }
    enqueueNow(`${b.upsertOn ? 'save' : 'insert'} ${b.table} (${rows.length})`, (db) =>
      b.upsertOn ? db.from(b.table).upsert(rows, { onConflict: b.upsertOn }) : db.from(b.table).insert(rows));
  }
}

function enqueueBatched(table: string, row: Record<string, unknown>, opts: { upsertOn?: string; key?: Batch['key'] } = {}): void {
  if (!supabase) return;
  const last = pending[pending.length - 1];
  if (last && last.table === table && last.upsertOn === opts.upsertOn) last.rows.push(row);
  else pending.push({ table, rows: [row], ...opts });
  if (!batchTimer) batchTimer = setTimeout(pushPending, BATCH_MS);
}

function enqueue(label: string, fn: (db: NonNullable<typeof supabase>) => PromiseLike<{ error: { message: string } | null }>): void {
  pushPending(); // whatever was batched before this write must reach the database before it
  enqueueNow(label, fn);
}

function enqueueNow(label: string, fn: (db: NonNullable<typeof supabase>) => PromiseLike<{ error: { message: string } | null }>): void {
  // Callers pass a closure over rows they already built (see note above); keep it that way.
  const db = supabase;
  if (!db) return;
  queue = queue
    .then(async () => {
      const { error } = await fn(db);
      if (error) console.error(`[db] ${label}: ${error.message}`);
    })
    .catch((e: unknown) => console.error(`[db] ${label}:`, e));
}

export const store = {
  // Resolves once every write queued so far has been sent (used before the teacher is shown the recap).
  flush: (): Promise<void> => {
    pushPending();
    return queue.then(() => undefined);
  },

  saveSession: (s: Session) => {
    const row = { id: s.id, code: s.code, title: s.title, teacher_id: s.teacherId };
    enqueue('insert session', (db) => db.from('sessions').insert(row));
  },

  endSession: (s: Session) =>
    enqueue('end session', (db) =>
      db.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', s.id)),

  saveStudent: (session: Session, student: Student) => {
    const row = { id: student.id, session_id: session.id, name: student.name, user_id: student.userId };
    enqueueBatched('students', row);
  },

  linkStudent: (student: Student) => {
    const { id, userId } = student;
    enqueue('link student to account', (db) => db.from('students').update({ user_id: userId }).eq('id', id));
  },

  startCheckIn: (session: Session, checkIn: CheckIn) => {
    const row = { id: checkIn.id, session_id: session.id, topic: checkIn.topic };
    enqueue('insert check-in', (db) => db.from('checkins').insert(row));
  },

  finishCheckIn: (summary: Summary) => {
    const update = {
      ended_at: new Date().toISOString(),
      green: summary.counts.green, yellow: summary.counts.yellow, red: summary.counts.red,
      unmarked: summary.counts.waiting, pct: summary.pct,
    };
    enqueue('finish check-in', (db) => db.from('checkins').update(update).eq('id', summary.id));
  },

  // every color change, so the timeline can be rebuilt later
  saveStatus: (checkIn: CheckIn, student: Student) => {
    const row = {
      id: randomUUID(), checkin_id: checkIn.id, student_id: student.id, status: student.status, reason: student.reason,
    };
    enqueueBatched('status_events', row);
  },

  // ---- Blindspot ---- one blindspot_questions row per teacher:launchQuestion (round.dbId), never
  // per recheck -- a recheck just bumps round.round for the child rows below.
  saveQuestion: (session: Session, round: QuestionRound) => {
    const row = {
      id: round.dbId, session_id: session.id, question_id: round.id, topic: round.topic,
      prompt: round.prompt, correct_option_id: round.correctOptionId, options: round.options,
      kind: round.kind, source: round.source, context: round.context ?? null,
    };
    enqueue('insert blindspot question', (db) => db.from('blindspot_questions').insert(row));
  },

  // Upserted on (question_id, student_id, round): a student can change their mind before the
  // round closes, and this keeps that as one row per round instead of piling up duplicates.
  saveAnswer: (
    round: QuestionRound,
    studentId: string,
    answer: { optionId: string; confidence: Confidence; explanation?: string; text?: string },
    correct: boolean,
  ) => {
    const row = {
      id: randomUUID(), question_id: round.dbId, student_id: studentId, round: round.round,
      option_id: answer.optionId, confidence: answer.confidence, correct, explanation: answer.explanation ?? null,
      answer_text: answer.text ?? null,
    };
    enqueueBatched('blindspot_answers', row, {
      upsertOn: 'question_id,student_id,round',
      key: (r) => `${r.question_id}|${r.student_id}|${r.round}`,
    });
  },

  // The end-of-class feedback form. One row per student; sending it again replaces the first one.
  saveFeedback: (session: Session, feedback: { id: string; studentId: string; rating: number; comment: string; anonymous: boolean }) => {
    const row = {
      id: feedback.id, session_id: session.id, student_id: feedback.studentId,
      rating: feedback.rating, comment: feedback.comment, anonymous: feedback.anonymous,
    };
    enqueueBatched('class_feedback', row, {
      upsertOn: 'session_id,student_id',
      key: (r) => `${r.session_id}|${r.student_id}`,
    });
  },

  savePairs: (round: QuestionRound, pairs: Pair[]) => {
    const rows = pairs.map((pair) => ({
      id: randomUUID(), question_id: round.dbId, round: round.round, pair_key: pair.pairId,
      explainer_student_id: pair.explainer.id, listener_student_id: pair.listener.id,
    }));
    enqueue('insert blindspot pairs', (db) => db.from('blindspot_pairs').insert(rows));
  },

  // One row per AI summary (a teacher can ask again as more answers come in; the newest wins).
  saveSummary: (questionDbId: string, round: number, summary: ClassConfusionSummary) => {
    const row = {
      id: randomUUID(), question_id: questionDbId, round, answered: summary.answered,
      summary, provider: summary.provider,
    };
    enqueue('insert ai summary', (db) => db.from('ai_summaries').insert(row));
  },

  // Upserted on (pair_key, student_id): the listener can change their rating before moving on.
  saveClarityRating: (round: QuestionRound, pairKey: string, studentId: string, rating: number) => {
    const row = { id: randomUUID(), question_id: round.dbId, round: round.round, pair_key: pairKey, student_id: studentId, rating };
    enqueue('save clarity rating', (db) =>
      db.from('blindspot_clarity_ratings').upsert(row, { onConflict: 'pair_key,student_id' }));
  },
};
