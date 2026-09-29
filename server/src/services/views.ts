import { computePulse } from './pulseService.ts';
import type { TeacherState, StudentState } from '../../../shared/types.ts';
import type { Session, Student } from './types.ts';

// Full state for a teacher who just opened or refreshed the dashboard.
export const teacherSnapshot = (session: Session): TeacherState => ({
  code: session.code,
  title: session.title,
  focusMode: session.focusMode,
  pulse: computePulse(session),
  history: session.checkIns,
  timeline: session.timeline,
});

// What a student needs to draw their screen (also used after a reconnect).
export const studentState = (session: Session, student: Student): StudentState => ({
  studentId: student.id,
  rejoinKey: student.rejoinKey,
  name: student.name,
  title: session.title,
  topic: session.current.topic,
  checkInId: session.current.id,
  status: student.status,
  reason: student.reason,
  focusMode: session.focusMode,
});
