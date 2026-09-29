import { randomUUID } from 'node:crypto';
import { REASONS, CUSTOM_REASON_PREFIX, CUSTOM_REASON_MAX, isCustomReason, customReasonText } from '../../../shared/events.ts';
import { store } from '../db/store.ts';
import { tally, summarizeCurrent } from './pulseService.ts';
import type { Mark, CheckIn } from '../../../shared/types.ts';
import type { AnswerRecord, Session, Student, StudentAnswer } from './types.ts';

// Live classroom state lives here, in memory (fast, no round trips). The database only records history.

export class UserError extends Error {} // problems the user caused: shown to them, not logged as bugs

const sessions = new Map<string, Session>();
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

setInterval(() => {
  for (const [code, s] of sessions) if (Date.now() - s.createdAt > MAX_AGE_MS) sessions.delete(code);
}, 60 * 60 * 1000).unref();

const clean = (text: unknown, max: number) => String(text ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const newCheckIn = (topic: string): CheckIn => ({ id: randomUUID(), topic, startedAt: Date.now() });

export function createSession(title: unknown, teacherId: string | null = null): Session {
  let code;
  do code = String(Math.floor(1000 + Math.random() * 9000));
  while (sessions.has(code));
  const session: Session = {
    id: randomUUID(),
    code,
    title: clean(title, 60),
    teacherId,
    createdAt: Date.now(),
    students: new Map<string, Student>(),   // studentId -> { id, name, socketId, connected, status, reason, focus }
    checkIns: [],          // finished check-ins that had at least one mark (history)
    current: newCheckIn(''), // the check-in students are marking right now
    timeline: [],          // [{ t, pct, marked, total, checkInId }] for the "where did we lose them" chart
    focusMode: true,
    currentQuestion: null,                             // the live Blindspot question, if any (see questionService.ts)
    answers: new Map<string, StudentAnswer>(),         // studentId -> answer, for the current question round only
    answerHistory: new Map<string, AnswerRecord[]>(),  // studentId -> every past round's answer, for calibration
    pairs: [],                                         // the latest teacher:pairUp result for the current question
  };
  sessions.set(code, session);
  store.saveSession(session);
  store.startCheckIn(session, session.current);
  return session;
}

export const getSession = (code: unknown): Session | undefined => sessions.get(String(code ?? '').trim());

export function requireSession(code: unknown): Session {
  const s = getSession(code);
  if (!s) throw new UserError('Class not found. Check the code.');
  return s;
}

function uniqueName(session: Session, raw: unknown): string {
  const base = clean(raw, 24);
  if (!base) throw new UserError('Please enter your name');
  const taken = new Set([...session.students.values()].map((s) => s.name.toLowerCase()));
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} ${n}`;
  return name;
}

// Reconnecting phones send their old studentId + rejoinKey so they keep their color (the key proves
// it's the same device: classmates can learn a studentId, never the key). A signed-in student is
// also recognised by their account, so opening the class on a second device doesn't create a twin.
export function joinStudent(
  session: Session,
  {
    name,
    studentId,
    rejoinKey,
    socketId,
    userId = null,
  }: { name: unknown; studentId?: unknown; rejoinKey?: unknown; socketId: string; userId?: string | null },
): Student {
  let student: Student | null | undefined = typeof studentId === 'string' ? session.students.get(studentId) : null;
  if (student && (typeof rejoinKey !== 'string' || rejoinKey !== student.rejoinKey)) student = null;
  if (!student && userId) student = [...session.students.values()].find((s) => s.userId === userId) ?? null;
  // the same connection joining twice (double emit) is still the same student
  if (!student) student = [...session.students.values()].find((s) => s.socketId === socketId) ?? null;
  if (student) {
    student.socketId = socketId;
    student.connected = true;
    if (userId && !student.userId) {
      student.userId = userId; // joined as a guest, then signed in: link this class to the account
      store.linkStudent(student);
    }
    return student;
  }
  student = {
    id: randomUUID(), name: uniqueName(session, name), socketId, connected: true, status: 'waiting', reason: null, focus: 0,
    userId, rejoinKey: randomUUID(),
  };
  session.students.set(student.id, student);
  store.saveStudent(session, student);
  return student;
}

// Add a point to the timeline, skipping exact repeats.
export function pushSample(session: Session): void {
  const t = tally([...session.students.values()]);
  const sample = { t: Date.now(), pct: t.pct, marked: t.marked, total: t.total, checkInId: session.current.id };
  const last = session.timeline.at(-1);
  if (last && last.pct === sample.pct && last.marked === sample.marked && last.checkInId === sample.checkInId) return;
  session.timeline.push(sample);
  if (session.timeline.length > 600) session.timeline.shift();
}

// A student marks (or changes) their color. Allowed at any time, that is the whole point.
export function setStatus(session: Session, student: Student, { status, reason }: { status: unknown; reason?: unknown }): void {
  if (typeof status !== 'string' || !['green', 'yellow', 'red'].includes(status)) throw new UserError('Invalid choice');
  let r: string | null = null;
  if (status !== 'green' && reason) {
    if (typeof reason === 'string' && isCustomReason(reason)) {
      // "Other": the student's own words. Same cleanup as names/topics, and never stored empty.
      const text = clean(customReasonText(reason), CUSTOM_REASON_MAX);
      if (!text) throw new UserError('Please write a reason');
      r = CUSTOM_REASON_PREFIX + text;
    } else {
      if (!REASONS.some((x) => x.id === reason)) throw new UserError('Invalid reason');
      r = reason as string;
    }
  }
  student.status = status as Mark;
  student.reason = r;
  store.saveStatus(session.current, student);
  pushSample(session);
}

function finishCurrent(session: Session): void {
  const summary = summarizeCurrent(session);
  store.finishCheckIn(summary);
  if (summary.marked > 0) session.checkIns.push(summary); // empty check-ins are not worth keeping in the history
}

// Teacher: "check in now". Freezes the current check-in, clears every color, starts a fresh one.
export function startCheckIn(session: Session, topic: unknown) {
  finishCurrent(session);
  for (const s of session.students.values()) {
    s.status = 'waiting';
    s.reason = null;
    s.focus = 0;
  }
  session.current = newCheckIn(clean(topic, 80));
  store.startCheckIn(session, session.current);
  pushSample(session);
  return { checkIn: session.current, history: session.checkIns };
}

// Focus mode: count how often a student left the page. Returns null if it does not apply.
export function recordFocus(session: Session, student: Student, type: unknown): number | null {
  if (!session.focusMode || type !== 'left') return null;
  student.focus++;
  return student.focus;
}

export function endSession(session: Session): void {
  finishCurrent(session);
  sessions.delete(session.code);
  store.endSession(session);
}
