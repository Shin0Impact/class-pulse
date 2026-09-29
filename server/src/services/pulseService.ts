import { REASONS, WEIGHTS, OTHER_REASON_ID, isCustomReason, customReasonText } from '../../../shared/events.ts';
import type { CheckIn, Counts, Pulse, Summary } from '../../../shared/types.ts';
import type { Session, Student } from './types.ts';

// Pure functions: given the live session, compute what the teacher sees.

export const normTopic = (t: unknown): string => String(t ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// Class understanding: green counts 100, yellow 50, red 0, averaged over the students who marked.
// pct is null until someone marks (so the UI can show "no data yet" instead of a fake 0%).
export function tally(students: Student[]) {
  const counts: Counts = { green: 0, yellow: 0, red: 0, waiting: 0 };
  for (const s of students) counts[s.status]++;
  const marked = counts.green + counts.yellow + counts.red;
  const pct = marked
    ? Math.round((counts.green * WEIGHTS.green + counts.yellow * WEIGHTS.yellow + counts.red * WEIGHTS.red) / marked)
    : null;
  return { counts, marked, total: students.length, pct };
}

// Live before/after: this check-in against the latest earlier check-in with the same topic.
function comparisonFor(session: Session, t: ReturnType<typeof tally>): Pulse['comparison'] {
  const key = normTopic(session.current.topic);
  if (!key || t.pct === null) return null;
  const prev = [...session.checkIns].reverse().find((c) => normTopic(c.topic) === key);
  if (!prev || prev.pct === null) return null;
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

  const byReason = new Map<string, number>();
  // Every custom "Other" reason is its own sentence, so one bar per sentence would be a wall of 1s.
  // They are counted as one "Other" bar, and the words are listed separately (de-duplicated).
  let otherCount = 0;
  const otherNotes: string[] = [];
  for (const s of list) {
    if ((s.status !== 'yellow' && s.status !== 'red') || !s.reason) continue;
    if (isCustomReason(s.reason)) {
      otherCount++;
      const note = customReasonText(s.reason);
      if (note && !otherNotes.some((n) => n.toLowerCase() === note.toLowerCase())) otherNotes.push(note);
    } else {
      byReason.set(s.reason, (byReason.get(s.reason) || 0) + 1);
    }
  }
  const reasons = [...REASONS, { id: OTHER_REASON_ID, label: 'Other' }]
    .map((r) => ({ ...r, count: r.id === OTHER_REASON_ID ? otherCount : byReason.get(r.id) || 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    t: Date.now(),
    checkIn: { id: session.current.id, topic: session.current.topic, startedAt: session.current.startedAt },
    ...t,
    reasons,
    otherNotes: otherNotes.slice(0, 20),
    comparison: comparisonFor(session, t),
    perStudent: list.map((s) => ({
      id: s.id, name: s.name, connected: s.connected, status: s.status, reason: s.reason, focusFlags: s.focus,
    })),
  };
}

// Frozen summary of a finished check-in (goes into the history and the database).
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
