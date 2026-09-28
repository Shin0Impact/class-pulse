import { randomUUID } from 'node:crypto';
import { supabase } from './supabase.ts';
import type { CheckIn, Confidence, Pair, Summary } from '../../../shared/types.ts';
import type { QuestionRound, Session, Student } from '../services/types.ts';

// Persistence layer. Live state stays in memory (see sessionService); this only records history.
// Writes are queued so they hit the database in order (a check-in row exists before its status events),
// and a database problem is logged but NEVER breaks the live classroom.

let queue: Promise<void> = Promise.resolve();

function enqueue(label: string, fn: (db: NonNullable<typeof supabase>) => PromiseLike<{ error: { message: string } | null }>): void {
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
  saveSession: (s: Session) =>
    enqueue('insert session', (db) => db.from('sessions').insert({ id: s.id, code: s.code, title: s.title })),

  endSession: (s: Session) =>
    enqueue('end session', (db) =>
      db.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', s.id)),

  saveStudent: (session: Session, student: Student) =>
    enqueue('insert student', (db) =>
      db.from('students').insert({ id: student.id, session_id: session.id, name: student.name })),

  startCheckIn: (session: Session, checkIn: CheckIn) =>
    enqueue('insert check-in', (db) =>
      db.from('checkins').insert({ id: checkIn.id, session_id: session.id, topic: checkIn.topic })),

  finishCheckIn: (summary: Summary) =>
    enqueue('finish check-in', (db) =>
      db.from('checkins').update({
        ended_at: new Date().toISOString(),
        green: summary.counts.green, yellow: summary.counts.yellow, red: summary.counts.red,
        unmarked: summary.counts.waiting, pct: summary.pct,
      }).eq('id', summary.id)),

  // every color change, so the timeline can be rebuilt later
  saveStatus: (checkIn: CheckIn, student: Student) =>
    enqueue('insert status', (db) =>
      db.from('status_events').insert({
        id: randomUUID(), checkin_id: checkIn.id, student_id: student.id, status: student.status, reason: student.reason,
      })),

  // ---- Blindspot ---- one blindspot_questions row per teacher:launchQuestion (round.dbId), never
  // per recheck -- a recheck just bumps round.round for the child rows below.
  saveQuestion: (session: Session, round: QuestionRound) =>
    enqueue('insert blindspot question', (db) =>
      db.from('blindspot_questions').insert({
        id: round.dbId, session_id: session.id, question_id: round.id, topic: round.topic,
        prompt: round.prompt, correct_option_id: round.correctOptionId, options: round.options,
      })),

  // Upserted on (question_id, student_id, round): a student can change their mind before the
  // round closes, and this keeps that as one row per round instead of piling up duplicates.
  saveAnswer: (
    round: QuestionRound,
    studentId: string,
    answer: { optionId: string; confidence: Confidence; explanation?: string },
    correct: boolean,
  ) =>
    enqueue('save blindspot answer', (db) =>
      db.from('blindspot_answers').upsert(
        {
          id: randomUUID(), question_id: round.dbId, student_id: studentId, round: round.round,
          option_id: answer.optionId, confidence: answer.confidence, correct, explanation: answer.explanation ?? null,
        },
        { onConflict: 'question_id,student_id,round' },
      )),

  savePairs: (round: QuestionRound, pairs: Pair[]) =>
    enqueue('insert blindspot pairs', (db) =>
      db.from('blindspot_pairs').insert(
        pairs.map((pair) => ({
          id: randomUUID(), question_id: round.dbId, round: round.round, pair_key: pair.pairId,
          explainer_student_id: pair.explainer.id, listener_student_id: pair.listener.id,
        })),
      )),

  // Upserted on (pair_key, student_id): the listener can change their rating before moving on.
  saveClarityRating: (round: QuestionRound, pairKey: string, studentId: string, rating: number) =>
    enqueue('save clarity rating', (db) =>
      db.from('blindspot_clarity_ratings').upsert(
        { id: randomUUID(), question_id: round.dbId, round: round.round, pair_key: pairKey, student_id: studentId, rating },
        { onConflict: 'pair_key,student_id' },
      )),
};
