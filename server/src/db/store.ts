import { randomUUID } from 'node:crypto';
import { supabase } from './supabase.ts';
import type { CheckIn, Summary } from '../../../shared/types.ts';
import type { Session, Student } from '../services/types.ts';

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
};
