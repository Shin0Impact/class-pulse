import { randomUUID } from 'node:crypto';
import { supabase } from './supabase.js';

// Persistence layer. Live state stays in memory (see sessionService); this only records history.
// Writes are queued so they hit the database in order (a check-in row exists before its status events),
// and a database problem is logged but NEVER breaks the live classroom.

let queue = Promise.resolve();

function enqueue(label, fn) {
  if (!supabase) return;
  queue = queue
    .then(async () => {
      const { error } = await fn();
      if (error) console.error(`[db] ${label}: ${error.message}`);
    })
    .catch((e) => console.error(`[db] ${label}:`, e.message));
}

export const store = {
  saveSession: (s) =>
    enqueue('insert session', () => supabase.from('sessions').insert({ id: s.id, code: s.code, title: s.title })),

  endSession: (s) =>
    enqueue('end session', () =>
      supabase.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', s.id)),

  saveStudent: (session, student) =>
    enqueue('insert student', () =>
      supabase.from('students').insert({ id: student.id, session_id: session.id, name: student.name })),

  startCheckIn: (session, checkIn) =>
    enqueue('insert check-in', () =>
      supabase.from('checkins').insert({ id: checkIn.id, session_id: session.id, topic: checkIn.topic })),

  finishCheckIn: (summary) =>
    enqueue('finish check-in', () =>
      supabase.from('checkins').update({
        ended_at: new Date().toISOString(),
        green: summary.counts.green, yellow: summary.counts.yellow, red: summary.counts.red,
        unmarked: summary.counts.waiting, pct: summary.pct,
      }).eq('id', summary.id)),

  // every color change, so the timeline can be rebuilt later
  saveStatus: (checkIn, student) =>
    enqueue('insert status', () =>
      supabase.from('status_events').insert({
        id: randomUUID(), checkin_id: checkIn.id, student_id: student.id, status: student.status, reason: student.reason,
      })),
};
