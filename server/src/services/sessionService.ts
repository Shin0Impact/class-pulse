import { randomUUID } from "node:crypto";
import { REASONS } from "../../../shared/events.ts";
import { store } from "../db/store.ts";
import { tally, summarizeCurrent } from "./pulseService.ts";
import type { Mark, CheckIn } from "../../../shared/types.ts";
import type { AnswerRecord, Session, Student, StudentAnswer } from "./types.ts";

// Live classroom state lives here, in memory (fast, no round trips).
// The database only records history.

export class UserError extends Error {}

const sessions = new Map<string, Session>();

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

// Maximum length for a student's custom reason.
const MAX_CUSTOM_REASON_LENGTH = 160;

// Prefix used to distinguish a custom reason from a predefined reason ID.
export const CUSTOM_REASON_PREFIX = "other:";

setInterval(
  () => {
    for (const [code, s] of sessions) {
      if (Date.now() - s.createdAt > MAX_AGE_MS) {
        sessions.delete(code);
      }
    }
  },
  60 * 60 * 1000,
).unref();

const clean = (text: unknown, max: number) =>
  String(text ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);

const newCheckIn = (topic: string): CheckIn => ({
  id: randomUUID(),
  topic,
  startedAt: Date.now(),
});

export function createSession(title: unknown): Session {
  let code;

  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (sessions.has(code));

  const session: Session = {
    id: randomUUID(),
    code,
    title: clean(title, 60),
    createdAt: Date.now(),

    students: new Map<string, Student>(),

    checkIns: [],

    current: newCheckIn(""),

    timeline: [],

    focusMode: true,

    currentQuestion: null,

    answers: new Map<string, StudentAnswer>(),

    answerHistory: new Map<string, AnswerRecord[]>(),

    pairs: [],
  };

  sessions.set(code, session);

  store.saveSession(session);
  store.startCheckIn(session, session.current);

  return session;
}

export const getSession = (code: unknown): Session | undefined =>
  sessions.get(String(code ?? "").trim());

export function requireSession(code: unknown): Session {
  const s = getSession(code);

  if (!s) {
    throw new UserError("Class not found. Check the code.");
  }

  return s;
}

function uniqueName(session: Session, raw: unknown): string {
  const base = clean(raw, 24);

  if (!base) {
    throw new UserError("Please enter your name");
  }

  const taken = new Set(
    [...session.students.values()].map((s) => s.name.toLowerCase()),
  );

  let name = base;

  for (let n = 2; taken.has(name.toLowerCase()); n++) {
    name = `${base} ${n}`;
  }

  return name;
}

// Reconnecting phones send their old studentId
// so they keep their existing identity/state.
export function joinStudent(
  session: Session,
  {
    name,
    studentId,
    socketId,
  }: {
    name: unknown;
    studentId?: string;
    socketId: string;
  },
): Student {
  let student: Student | null | undefined = studentId
    ? session.students.get(studentId)
    : null;

  // The same connection joining twice is still
  // the same student.
  if (!student) {
    student =
      [...session.students.values()].find((s) => s.socketId === socketId) ??
      null;
  }

  if (student) {
    student.socketId = socketId;
    student.connected = true;

    return student;
  }

  student = {
    id: randomUUID(),
    name: uniqueName(session, name),
    socketId,
    connected: true,
    status: "waiting",
    reason: null,
    focus: 0,
  };

  session.students.set(student.id, student);

  store.saveStudent(session, student);

  return student;
}

// Add a point to the timeline,
// skipping exact repeats.
export function pushSample(session: Session): void {
  const t = tally([...session.students.values()]);

  const sample = {
    t: Date.now(),
    pct: t.pct,
    marked: t.marked,
    total: t.total,
    checkInId: session.current.id,
  };

  const last = session.timeline.at(-1);

  if (
    last &&
    last.pct === sample.pct &&
    last.marked === sample.marked &&
    last.checkInId === sample.checkInId
  ) {
    return;
  }

  session.timeline.push(sample);

  if (session.timeline.length > 600) {
    session.timeline.shift();
  }
}

/*
  A student marks or changes their color.

  Reasons can now be:

  1. One of the predefined REASONS IDs:
     too-fast
     unclear-steps
     need-example
     missing-basics

  2. A custom student reason:
     other:<student text>

  Custom text is cleaned and limited to
  MAX_CUSTOM_REASON_LENGTH characters.
*/
export function setStatus(
  session: Session,
  student: Student,
  {
    status,
    reason,
  }: {
    status: unknown;
    reason?: unknown;
  },
): void {
  if (
    typeof status !== "string" ||
    !["green", "yellow", "red"].includes(status)
  ) {
    throw new UserError("Invalid choice");
  }

  let r: string | null = null;

  if (status !== "green" && reason) {
    if (typeof reason !== "string") {
      throw new UserError("Invalid reason");
    }

    /*
      Existing predefined reason.
    */
    const predefined = REASONS.some((x) => x.id === reason);

    if (predefined) {
      r = reason;
    } else if (reason.startsWith(CUSTOM_REASON_PREFIX)) {
      /*
        Custom "Other" reason.
      */

      const rawCustomReason = reason.slice(CUSTOM_REASON_PREFIX.length);

      const customReason = clean(rawCustomReason, MAX_CUSTOM_REASON_LENGTH);

      if (!customReason) {
        throw new UserError("Please enter a reason");
      }

      r = CUSTOM_REASON_PREFIX + customReason;
    } else {
      throw new UserError("Invalid reason");
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

  if (summary.marked > 0) {
    session.checkIns.push(summary);
  }
}

// Teacher: "check in now".
// Freezes the current check-in,
// clears every color and starts fresh.
export function startCheckIn(session: Session, topic: unknown) {
  finishCurrent(session);

  for (const s of session.students.values()) {
    s.status = "waiting";
    s.reason = null;
    s.focus = 0;
  }

  session.current = newCheckIn(clean(topic, 80));

  store.startCheckIn(session, session.current);

  pushSample(session);

  return {
    checkIn: session.current,
    history: session.checkIns,
  };
}

// Focus mode:
// count how often a student left the page.
export function recordFocus(
  session: Session,
  student: Student,
  type: unknown,
): number | null {
  if (!session.focusMode || type !== "left") {
    return null;
  }

  student.focus++;

  return student.focus;
}

export function endSession(session: Session): void {
  finishCurrent(session);

  sessions.delete(session.code);

  store.endSession(session);
}
