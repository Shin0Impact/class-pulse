import { randomUUID } from 'node:crypto';
import { REASONS } from '../../../shared/events.js';
import { store } from '../db/store.js';
import { tally, summarizeCurrent } from './pulseService.js';

// Live classroom state lives here, in memory (fast, no round trips). The database only records history.

export class UserError extends Error {} // problems the user caused: shown to them, not logged as bugs

const sessions = new Map();
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

setInterval(() => {
  for (const [code, s] of sessions) if (Date.now() - s.createdAt > MAX_AGE_MS) sessions.delete(code);
}, 60 * 60 * 1000).unref();

const clean = (text, max) => String(text ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const newCheckIn = (topic) => ({ id: randomUUID(), topic, startedAt: Date.now() });

export function createSession(title) {
  let code;
  do code = String(Math.floor(1000 + Math.random() * 9000));
  while (sessions.has(code));
  const session = {
    id: randomUUID(),
    code,
    title: clean(title, 60),
    createdAt: Date.now(),
    students: new Map(),   // studentId -> { id, name, socketId, connected, status, reason, focus }
    checkIns: [],          // finished check-ins that had at least one mark (history)
    current: newCheckIn(''), // the check-in students are marking right now
    timeline: [],          // [{ t, pct, marked, total, checkInId }] for the "where did we lose them" chart
    focusMode: true,
  };
  sessions.set(code, session);
  store.saveSession(session);
  store.startCheckIn(session, session.current);
  return session;
}

export const getSession = (code) => sessions.get(String(code ?? '').trim());

export function requireSession(code) {
  const s = getSession(code);
  if (!s) throw new UserError('Class not found. Check the code.');
  return s;
}

function uniqueName(session, raw) {
  const base = clean(raw, 24);
  if (!base) throw new UserError('Please enter your name');
  const taken = new Set([...session.students.values()].map((s) => s.name.toLowerCase()));
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} ${n}`;
  return name;
}

// Reconnecting phones send their old studentId so they keep their color.
export function joinStudent(session, { name, studentId, socketId }) {
  let student = studentId ? session.students.get(studentId) : null;
  // the same connection joining twice (double emit) is still the same student
  if (!student) student = [...session.students.values()].find((s) => s.socketId === socketId) ?? null;
  if (student) {
    student.socketId = socketId;
    student.connected = true;
    return student;
  }
  student = { id: randomUUID(), name: uniqueName(session, name), socketId, connected: true, status: 'waiting', reason: null, focus: 0 };
  session.students.set(student.id, student);
  store.saveStudent(session, student);
  return student;
}

// Add a point to the timeline, skipping exact repeats.
export function pushSample(session) {
  const t = tally([...session.students.values()]);
  const sample = { t: Date.now(), pct: t.pct, marked: t.marked, total: t.total, checkInId: session.current.id };
  const last = session.timeline.at(-1);
  if (last && last.pct === sample.pct && last.marked === sample.marked && last.checkInId === sample.checkInId) return;
  session.timeline.push(sample);
  if (session.timeline.length > 600) session.timeline.shift();
}

// A student marks (or changes) their color. Allowed at any time, that is the whole point.
export function setStatus(session, student, { status, reason }) {
  if (!['green', 'yellow', 'red'].includes(status)) throw new UserError('Invalid choice');
  let r = null;
  if (status !== 'green' && reason) {
    if (!REASONS.some((x) => x.id === reason)) throw new UserError('Invalid reason');
    r = reason;
  }
  student.status = status;
  student.reason = r;
  store.saveStatus(session.current, student);
  pushSample(session);
}

function finishCurrent(session) {
  const summary = summarizeCurrent(session);
  store.finishCheckIn(summary);
  if (summary.marked > 0) session.checkIns.push(summary); // empty check-ins are not worth keeping in the history
}

// Teacher: "check in now". Freezes the current check-in, clears every color, starts a fresh one.
export function startCheckIn(session, topic) {
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
export function recordFocus(session, student, type) {
  if (!session.focusMode || type !== 'left') return null;
  student.focus++;
  return student.focus;
}

export function endSession(session) {
  finishCurrent(session);
  sessions.delete(session.code);
  store.endSession(session);
}
