import { computePulse } from './pulseService.js';

// Full state for a teacher who just opened or refreshed the dashboard.
export const teacherSnapshot = (session) => ({
  code: session.code,
  title: session.title,
  focusMode: session.focusMode,
  pulse: computePulse(session),
  history: session.checkIns,
  timeline: session.timeline,
});

// What a student needs to draw their screen (also used after a reconnect).
export const studentState = (session, student) => ({
  studentId: student.id,
  name: student.name,
  title: session.title,
  topic: session.current.topic,
  checkInId: session.current.id,
  status: student.status,
  reason: student.reason,
  focusMode: session.focusMode,
});
