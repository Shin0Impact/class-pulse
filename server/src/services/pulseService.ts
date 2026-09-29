import { REASONS, WEIGHTS } from "../../../shared/events.ts";
import type {
  CheckIn,
  Counts,
  Pulse,
  Summary,
  ReasonCount,
} from "../../../shared/types.ts";
import type { Session, Student } from "./types.ts";

// Pure functions: given the live session, compute what the teacher sees.

const CUSTOM_REASON_PREFIX = "other:";

export const normTopic = (t: unknown): string =>
  String(t ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// Class understanding:
// green = 100
// yellow = 50
// red = 0
//
// pct stays null until at least one student marks.
export function tally(students: Student[]) {
  const counts: Counts = {
    green: 0,
    yellow: 0,
    red: 0,
    waiting: 0,
  };

  for (const s of students) {
    counts[s.status]++;
  }

  const marked = counts.green + counts.yellow + counts.red;

  const pct = marked
    ? Math.round(
        (counts.green * WEIGHTS.green +
          counts.yellow * WEIGHTS.yellow +
          counts.red * WEIGHTS.red) /
          marked,
      )
    : null;

  return {
    counts,
    marked,
    total: students.length,
    pct,
  };
}

// Live before/after:
// this check-in compared with the latest earlier
// check-in that has the same topic.
function comparisonFor(
  session: Session,
  t: ReturnType<typeof tally>,
): Pulse["comparison"] {
  const key = normTopic(session.current.topic);

  if (!key || t.pct === null) {
    return null;
  }

  const prev = [...session.checkIns]
    .reverse()
    .find((c) => normTopic(c.topic) === key);

  if (!prev || prev.pct === null) {
    return null;
  }

  return {
    topic: session.current.topic,
    before: prev.pct,
    after: t.pct,
    delta: t.pct - prev.pct,
    beforeMarked: prev.marked,
    afterMarked: t.marked,
  };
}

export function computePulse(session: Session): Pulse {
  const list = [...session.students.values()];

  const t = tally(list);

  /*
    Count every reason students submitted.

    This includes:
    - predefined reason IDs
    - custom "other:..." reasons
  */
  const byReason = new Map<string, number>();

  for (const s of list) {
    if ((s.status === "yellow" || s.status === "red") && s.reason) {
      byReason.set(s.reason, (byReason.get(s.reason) || 0) + 1);
    }
  }

  /*
    Standard reasons.

    We keep the ID so the client can
    translate the label based on language.
  */
  const predefinedReasons: ReasonCount[] = REASONS.map((r) => ({
    id: r.id,
    label: r.label,
    count: byReason.get(r.id) || 0,
  })).filter((r) => r.count > 0);

  /*
    Custom reasons.

    Server stores them as:

      other:<student text>

    Teacher should only see the actual text,
    without the "other:" prefix.
  */
  const customReasons: ReasonCount[] = [];

  for (const [reason, count] of byReason) {
    if (!reason.startsWith(CUSTOM_REASON_PREFIX)) {
      continue;
    }

    const text = reason.slice(CUSTOM_REASON_PREFIX.length).trim();

    if (!text) continue;

    customReasons.push({
      id: reason,
      label: text,
      count,
    });
  }

  /*
    Standard + custom reasons are now
    part of the real PULSE_UPDATE payload.
  */
  const reasons = [...predefinedReasons, ...customReasons].sort(
    (a, b) => b.count - a.count,
  );

  return {
    t: Date.now(),

    checkIn: {
      id: session.current.id,
      topic: session.current.topic,
      startedAt: session.current.startedAt,
    },

    ...t,

    reasons,

    comparison: comparisonFor(session, t),

    perStudent: list.map((s) => ({
      id: s.id,
      name: s.name,
      connected: s.connected,
      status: s.status,
      reason: s.reason,
      focusFlags: s.focus,
    })),
  };
}

// Frozen summary of a finished check-in.
// Goes into history/database.
export function summarizeCurrent(session: Session): Summary {
  const t = tally([...session.students.values()]);

  return {
    id: session.current.id,
    topic: session.current.topic,
    startedAt: session.current.startedAt,
    endedAt: Date.now(),
    counts: t.counts,
    marked: t.marked,
    total: t.total,
    pct: t.pct,
  };
}
