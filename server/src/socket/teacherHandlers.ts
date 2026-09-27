import { EVENTS } from '../../../shared/events.ts';
import { FEATURES } from '../../../shared/features.ts';
import { createSession, getSession, requireSession, startCheckIn, endSession, UserError } from '../services/sessionService.ts';
import {
  launchQuestion,
  computeBlindspotUpdate,
  pairStudents,
  calibrationCardsForCurrentRound,
  recheckQuestion,
} from '../services/questionService.ts';
import { teacherSnapshot } from '../services/views.ts';
import { handle, teacherRoom, studentRoom, emitPulse } from './helpers.ts';
import type { Server, Socket } from 'socket.io';
import type { Session } from '../services/types.ts';

export function registerTeacherHandlers(io: Server, socket: Socket): void {
  const attach = (session: Session) => {
    socket.join(teacherRoom(session.code));
    socket.data = { role: 'teacher', code: session.code };
  };

  const requireTeacher = () => {
    const session = socket.data.role === 'teacher' ? getSession(socket.data.code) : null;
    if (!session) throw new UserError('Class not found. Reopen the dashboard.');
    return session;
  };

  socket.on(EVENTS.TEACHER_CREATE, handle(({ title }: { title?: unknown }) => {
    const session = createSession(title);
    attach(session);
    return { code: session.code, state: teacherSnapshot(session) };
  }));

  // Refreshing the page or a wifi blip: the teacher gets the full state back.
  socket.on(EVENTS.TEACHER_REJOIN, handle(({ code }: { code?: unknown }) => {
    const session = requireSession(code);
    attach(session);
    return { code: session.code, state: teacherSnapshot(session) };
  }));

  // "Check in now": every student's color is cleared so they re-mark, e.g. after re-teaching.
  socket.on(EVENTS.TEACHER_CHECK_IN, handle(({ topic }: { topic?: unknown }) => {
    const session = requireTeacher();
    const { checkIn, history } = startCheckIn(session, topic);
    io.to(studentRoom(session.code)).emit(EVENTS.CHECK_IN_STARTED, { checkInId: checkIn.id, topic: checkIn.topic });
    io.to(teacherRoom(session.code)).emit(EVENTS.CHECK_IN_STARTED, { checkIn, history });
    emitPulse(io, session);
    return {};
  }));

  socket.on(EVENTS.TEACHER_SET_FOCUS_MODE, handle(({ enabled }: { enabled?: unknown }) => {
    const session = requireTeacher();
    session.focusMode = FEATURES.focusMode && Boolean(enabled);
    io.to(studentRoom(session.code)).emit(EVENTS.FOCUS_MODE, { enabled: session.focusMode });
    return { focusMode: session.focusMode };
  }));

  // Launches a Blindspot question: students get it with no correct answer attached (see
  // questionService.ts), and the teacher gets a fresh, empty quadrant breakdown right away so the
  // dashboard resets for the new round instead of showing stale data from the last question.
  socket.on(EVENTS.TEACHER_LAUNCH_QUESTION, handle((payload: { question?: unknown }) => {
    const session = requireTeacher();
    const publicQuestion = launchQuestion(session, payload);
    io.to(studentRoom(session.code)).emit(EVENTS.QUESTION_STARTED, publicQuestion);
    io.to(teacherRoom(session.code)).emit(EVENTS.BLINDSPOT_UPDATE, computeBlindspotUpdate(session));
    return {};
  }));

  // Computes pairs from the current quadrant groups and hands them straight to the two students
  // involved -- their own socket room (every socket auto-joins one named after its own id), never
  // a broadcast, so nobody else sees who got paired with whom.
  socket.on(EVENTS.TEACHER_PAIR_UP, handle(() => {
    const session = requireTeacher();
    const { pairs, questionId } = pairStudents(session);
    for (const pair of pairs) {
      const explainer = session.students.get(pair.explainer.id);
      const listener = session.students.get(pair.listener.id);
      if (explainer) {
        io.to(explainer.socketId).emit(EVENTS.PAIR_ASSIGNED, { pairId: pair.pairId, partner: pair.listener, role: 'explainer', questionId });
      }
      if (listener) {
        io.to(listener.socketId).emit(EVENTS.PAIR_ASSIGNED, { pairId: pair.pairId, partner: pair.explainer, role: 'listener', questionId });
      }
    }
    return { pairs };
  }));

  // Scores the round that's about to close with a calibration card per student who answered (sent
  // privately, one per student), then re-opens the same question for round 2 so minds can change.
  socket.on(EVENTS.TEACHER_RECHECK, handle(() => {
    const session = requireTeacher();
    for (const card of calibrationCardsForCurrentRound(session)) {
      const student = session.students.get(card.studentId);
      if (student) io.to(student.socketId).emit(EVENTS.CALIBRATION_CARD, card);
    }
    const publicQuestion = recheckQuestion(session);
    io.to(studentRoom(session.code)).emit(EVENTS.QUESTION_STARTED, publicQuestion);
    io.to(teacherRoom(session.code)).emit(EVENTS.BLINDSPOT_UPDATE, computeBlindspotUpdate(session));
    return {};
  }));

  socket.on(EVENTS.TEACHER_END_SESSION, handle(() => {
    const session = requireTeacher();
    io.to(studentRoom(session.code)).emit(EVENTS.SESSION_ENDED, {});
    io.to(teacherRoom(session.code)).emit(EVENTS.SESSION_ENDED, {});
    endSession(session);
    return {};
  }));
}
