import { computePulse } from './pulseService.ts';
import { feedbackSummary } from './feedbackService.ts';
import { quizForStudent, quizResults } from './quizService.ts';
import { computeBlindspotUpdate, publicQuestion } from './questionService.ts';
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
  question: session.currentQuestion
    ? {
        ...publicQuestion(session.currentQuestion, session.currentQuestion.round > 1),
        closed: session.currentQuestion.closed,
        correctOptionId: session.currentQuestion.correctOptionId,
      }
    : null,
  blindspot: session.currentQuestion ? computeBlindspotUpdate(session) : null,
  summary: session.currentQuestion?.summary ?? null,
  feedbackOpen: session.feedbackOpen,
  feedback: feedbackSummary(session),
  quiz: quizResults(session),
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
  question:
    session.currentQuestion && !session.currentQuestion.closed
      ? publicQuestion(session.currentQuestion, session.currentQuestion.round > 1)
      : null,
  answered: session.answers.has(student.id),
  feedbackOpen: session.feedbackOpen,
  feedbackSubmitted: session.feedback.some((f) => f.studentId === student.id),
  quiz: quizForStudent(session, student),
});
